import { describe, it, expect, vi } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { createClient } from '../client';
import { bearerAuth } from '../auth';
import { server } from './server';

const client = createClient({ project: 'test', auth: bearerAuth('test-token') });

const RAW_QUERY = `
  query GetPage($slug: String!) {
    page(slug: $slug) {
      title
    }
  }
`;

describe('createClient project resolution', () => {
  function captureUrls(project: string) {
    let capturedGraphUrl: string | undefined;
    let capturedAuthUrl: string | undefined;

    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    });

    const client = createClient({
      project,
      fetch: fetchFn as unknown as typeof globalThis.fetch,
      auth: (_headers, ctx) => {
        capturedAuthUrl = ctx.authUrl;
        return _headers;
      },
    });

    return {
      async resolve() {
        await client.query('query Test { __typename }').catch(() => {});
        capturedGraphUrl = (fetchFn.mock.calls[0]?.[0] as string) ?? undefined;
        return { graphUrl: capturedGraphUrl, authUrl: capturedAuthUrl };
      },
    };
  }

  it.each([
    'acme',
    'https://acme.mountain-labs.io',
    'https://graph.acme.mountain-labs.io',
    'https://auth.acme.mountain-labs.io',
  ])('derives correct URLs from "%s"', async (project) => {
    const { graphUrl, authUrl } = await captureUrls(project).resolve();
    expect(graphUrl).toBe('https://graph.acme.mountain-labs.io/graphql');
    expect(authUrl).toBe('https://auth.acme.mountain-labs.io');
  });

  it('throws for an unrecognised URL', () => {
    expect(() => createClient({ project: 'https://evil.com' })).toThrow('Invalid project URL');
  });
});

describe('client.query', () => {
  it('returns typed data from a raw query', async () => {
    server.use(
      graphql.query('GetPage', () =>
        HttpResponse.json({ data: { page: { title: 'Home' } } }),
      ),
    );

    const result = await client.query<{ page: { title: string } }>(RAW_QUERY, { slug: 'home' });

    expect(result.page.title).toBe('Home');
  });

  it('sends variables', async () => {
    let capturedVariables: unknown;

    server.use(
      graphql.query('GetPage', ({ variables }) => {
        capturedVariables = variables;
        return HttpResponse.json({ data: { page: { title: 'Home' } } });
      }),
    );

    await client.query(RAW_QUERY, { slug: 'home' });

    expect(capturedVariables).toEqual({ slug: 'home' });
  });

  it('attaches the auth header', async () => {
    let authHeader: string | null = null;

    server.use(
      graphql.query('GetPage', ({ request }) => {
        authHeader = request.headers.get('Authorization');
        return HttpResponse.json({ data: { page: { title: 'Home' } } });
      }),
    );

    await client.query(RAW_QUERY, { slug: 'home' });

    expect(authHeader).toBe('Bearer test-token');
  });

  it('sends no Authorization header when auth is omitted', async () => {
    let authHeader: string | null = 'sentinel';

    server.use(
      graphql.query('GetPage', ({ request }) => {
        authHeader = request.headers.get('Authorization');
        return HttpResponse.json({ data: { page: { title: 'Home' } } });
      }),
    );

    const publicClient = createClient({ project: 'test' });
    await publicClient.query(RAW_QUERY, { slug: 'home' });

    expect(authHeader).toBeNull();
  });

  it('throws on GraphQL errors', async () => {
    server.use(
      graphql.query('GetPage', () =>
        HttpResponse.json({ errors: [{ message: 'Not found' }] }),
      ),
    );

    await expect(client.query(RAW_QUERY, { slug: 'missing' })).rejects.toThrow('Not found');
  });

  it('joins multiple GraphQL errors', async () => {
    server.use(
      graphql.query('GetPage', () =>
        HttpResponse.json({ errors: [{ message: 'Error A' }, { message: 'Error B' }] }),
      ),
    );

    await expect(client.query(RAW_QUERY, { slug: 'missing' })).rejects.toThrow('Error A, Error B');
  });

  it('throws on HTTP errors', async () => {
    server.use(
      graphql.query('GetPage', () => new HttpResponse(null, { status: 401 })),
    );

    await expect(client.query(RAW_QUERY, { slug: 'home' })).rejects.toThrow('401');
  });

  it('works without variables', async () => {
    server.use(
      graphql.query('ListPages', () =>
        HttpResponse.json({ data: { pages: { edges: [] } } }),
      ),
    );

    const result = await client.query<{ pages: { edges: [] } }>('query ListPages { pages { edges { node { slug } } } }');

    expect(result.pages.edges).toEqual([]);
  });
});
