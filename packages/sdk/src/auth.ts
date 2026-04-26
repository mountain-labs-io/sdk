import type { AuthInterceptor, AuthInterceptorContext } from './types';

/** Returns an {@link AuthInterceptor} that sets a static Bearer token. */
export function bearerAuth(token: string): AuthInterceptor {
  return (headers) => ({ ...headers, Authorization: `Bearer ${token}` });
}

interface ClientCredentialsOptions {
  /** OAuth client ID. */
  clientId: string;
  /** OAuth client secret. */
  clientSecret: string;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

/**
 * Returns an {@link AuthInterceptor} that exchanges client credentials for a Bearer token
 * using the OAuth 2.0 client credentials grant. Tokens are cached and refreshed automatically
 * 60 seconds before expiry. The token endpoint is `{authUrl}/oauth/token`.
 */
export function clientCredentials(opts: ClientCredentialsOptions): AuthInterceptor {
  let cache: TokenCache | null = null;

  async function getToken(ctx: AuthInterceptorContext, tokenUrl: string): Promise<string> {
    if (cache && Date.now() < cache.expiresAt - 60_000) {
      return cache.token;
    }

    const response = await ctx.fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: opts.clientId,
        client_secret: opts.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as { access_token: string; expires_in?: number };

    cache = {
      token: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    };

    return cache.token;
  }

  return async (headers, ctx) => {
    const token = await getToken(ctx, `${ctx.authUrl}/oauth/token`);
    return { ...headers, Authorization: `Bearer ${token}` };
  };
}
