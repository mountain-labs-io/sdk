import { describe, it, expect, vi } from 'vitest';
import { bearerAuth, clientCredentials } from '../auth';
import type { AuthInterceptorContext } from '../types';

const AUTH_URL = 'https://auth.example.com';

function makeCtx(fetchFn: typeof globalThis.fetch): AuthInterceptorContext {
  return { fetch: fetchFn, authUrl: AUTH_URL };
}

function makeFetch(token: string, expiresIn = 3600) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ access_token: token, expires_in: expiresIn }),
  });
}

describe('bearerAuth', () => {
  it('sets Authorization header', async () => {
    const interceptor = bearerAuth('my-token');
    const result = await interceptor({ 'Content-Type': 'application/json' }, makeCtx(vi.fn()));
    expect(result).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer my-token',
    });
  });

  it('does not mutate the input headers', async () => {
    const interceptor = bearerAuth('my-token');
    const input = { 'Content-Type': 'application/json' };
    await interceptor(input, makeCtx(vi.fn()));
    expect(input).not.toHaveProperty('Authorization');
  });
});

describe('clientCredentials', () => {
  it('fetches a token and sets Authorization header', async () => {
    const fetchFn = makeFetch('cc-token');
    const interceptor = clientCredentials({ clientId: 'id', clientSecret: 'secret' });

    const result = await interceptor(
      { 'Content-Type': 'application/json' },
      makeCtx(fetchFn as unknown as typeof globalThis.fetch),
    );

    expect(result).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer cc-token',
    });
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('derives tokenUrl from ctx.authUrl', async () => {
    const fetchFn = makeFetch('cc-token');
    const interceptor = clientCredentials({ clientId: 'id', clientSecret: 'secret' });

    await interceptor({}, makeCtx(fetchFn as unknown as typeof globalThis.fetch));

    const [url] = fetchFn.mock.calls[0];
    expect(url).toBe(`${AUTH_URL}/oauth/token`);
  });

  it('sends correct client_credentials body', async () => {
    const fetchFn = makeFetch('cc-token');
    const interceptor = clientCredentials({ clientId: 'my-client', clientSecret: 'my-secret' });

    await interceptor({}, makeCtx(fetchFn as unknown as typeof globalThis.fetch));

    const [, init] = fetchFn.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
    expect(init.body).toContain('grant_type=client_credentials');
    expect(init.body).toContain('client_id=my-client');
    expect(init.body).toContain('client_secret=my-secret');
  });

  it('caches the token and does not re-fetch on subsequent calls', async () => {
    const fetchFn = makeFetch('cc-token', 3600);
    const interceptor = clientCredentials({ clientId: 'id', clientSecret: 'secret' });
    const ctx = makeCtx(fetchFn as unknown as typeof globalThis.fetch);

    await interceptor({}, ctx);
    await interceptor({}, ctx);
    await interceptor({}, ctx);

    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('refreshes the token when it is close to expiry', async () => {
    vi.useFakeTimers();

    const fetchFn = makeFetch('cc-token', 60); // expires in 60s — immediately within buffer
    const interceptor = clientCredentials({ clientId: 'id', clientSecret: 'secret' });
    const ctx = makeCtx(fetchFn as unknown as typeof globalThis.fetch);

    await interceptor({}, ctx);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await interceptor({}, ctx);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('throws when the token endpoint returns an error', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });
    const interceptor = clientCredentials({ clientId: 'id', clientSecret: 'bad-secret' });

    await expect(
      interceptor({}, makeCtx(fetchFn as unknown as typeof globalThis.fetch)),
    ).rejects.toThrow('Token request failed: 401 Unauthorized');
  });

  it('defaults expires_in to 3600 when not present in response', async () => {
    vi.useFakeTimers();

    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'tok' }),
    });
    const interceptor = clientCredentials({ clientId: 'id', clientSecret: 'secret' });
    const ctx = makeCtx(fetchFn as unknown as typeof globalThis.fetch);

    await interceptor({}, ctx);
    vi.advanceTimersByTime(3600 * 1000 - 60_000 - 1);
    await interceptor({}, ctx);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    await interceptor({}, ctx);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
