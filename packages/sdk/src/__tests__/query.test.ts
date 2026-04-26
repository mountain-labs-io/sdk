import { describe, it, expect } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { createClient } from '../client';
import { server } from './server';

const client = createClient({ token: 'test-token' });

const RAW_QUERY = `
  query GetPage($slug: String!) {
    page(slug: $slug) {
      title
    }
  }
`;

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
