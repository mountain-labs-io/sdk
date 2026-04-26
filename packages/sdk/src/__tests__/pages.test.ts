import { describe, it, expect } from 'vitest';
import { createClient } from '../client';
import { mockPage, mockPageGraphQLError, mockPageHttpError, mockPages } from './server';

const client = createClient({ token: 'test-token' });

describe('pages.get', () => {
  it('fetches a page by slug', async () => {
    mockPage(({ ref }) => ({ slug: ref.slug, title: 'Home', publishedAt: null }));

    const page = await client.pages.get('home');

    expect(page.slug).toBe('home');
    expect(page.title).toBe('Home');
    expect(page.publishedAt).toBeNull();
  });

  it('fetches a page by id', async () => {
    mockPage(({ ref }) => ({ slug: 'home', title: 'Home', publishedAt: null, id: ref.id }));

    const page = await client.pages.get('page_abc123');

    expect(page.slug).toBe('home');
  });

  it('sends slug ref for non-id strings', async () => {
    let capturedVariables: unknown;

    mockPage((variables) => {
      capturedVariables = variables;
      return { slug: 'about', title: 'About', publishedAt: null };
    });

    await client.pages.get('about');

    expect(capturedVariables).toMatchObject({ ref: { slug: 'about' } });
  });

  it('sends id ref for page_ prefixed strings', async () => {
    let capturedVariables: unknown;

    mockPage((variables) => {
      capturedVariables = variables;
      return { slug: 'home', title: 'Home', publishedAt: null };
    });

    await client.pages.get('page_abc123');

    expect(capturedVariables).toMatchObject({ ref: { id: 'page_abc123' } });
  });

  it('supports custom fields', async () => {
    mockPage({ title: 'Home' });

    const page = await client.pages.get<{ title: string }>('home', { fields: 'title' });

    expect(page.title).toBe('Home');
  });

  it('throws when page is not found', async () => {
    mockPage(null);

    await expect(client.pages.get('missing')).rejects.toThrow('Page not found: missing');
  });

  it('throws on GraphQL errors', async () => {
    mockPageGraphQLError('Page not found');

    await expect(client.pages.get('missing')).rejects.toThrow('Page not found');
  });

  it('sends the auth header', async () => {
    let authHeader: string | null = null;

    mockPage((_, request) => {
      authHeader = request.headers.get('Authorization');
      return { slug: 'home', title: 'Home', publishedAt: null };
    });

    await client.pages.get('home');

    expect(authHeader).toBe('Bearer test-token');
  });

  it('throws on HTTP errors', async () => {
    mockPageHttpError(401);

    await expect(client.pages.get('home')).rejects.toThrow('401');
  });
});

describe('pages.list', () => {
  it('yields all pages from a single page of results', async () => {
    mockPages({
      edges: [
        { node: { slug: 'home', title: 'Home', publishedAt: null } },
        { node: { slug: 'about', title: 'About', publishedAt: null } },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    });

    const pages = [];
    for await (const page of client.pages.list()) {
      pages.push(page);
    }

    expect(pages).toHaveLength(2);
    expect(pages[0].slug).toBe('home');
    expect(pages[1].slug).toBe('about');
  });

  it('follows pagination cursors across multiple requests', async () => {
    const cursors: Array<string | undefined> = [];

    mockPages((variables) => {
      cursors.push(variables.connection?.cursor);
      if (!variables.connection?.cursor) {
        return {
          edges: [{ node: { slug: 'page-1', title: 'Page 1', publishedAt: null } }],
          pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
        };
      }
      return {
        edges: [{ node: { slug: 'page-2', title: 'Page 2', publishedAt: null } }],
        pageInfo: { hasNextPage: false, endCursor: null },
      };
    });

    const pages = [];
    for await (const page of client.pages.list()) {
      pages.push(page);
    }

    expect(pages).toHaveLength(2);
    expect(cursors).toEqual([undefined, 'cursor-1']);
  });

  it('supports custom fields', async () => {
    mockPages({ edges: [{ node: { slug: 'home' } }], pageInfo: { hasNextPage: false, endCursor: null } });

    const pages = [];
    for await (const page of client.pages.list<{ slug: string }>({ fields: 'slug' })) {
      pages.push(page);
    }

    expect(pages[0].slug).toBe('home');
  });

  it('sends the directory option', async () => {
    let capturedVariables: unknown;

    mockPages((variables) => {
      capturedVariables = variables;
      return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
    });

    for await (const _ of client.pages.list({ directory: '/docs' })) { /* empty */ }

    expect(capturedVariables).toMatchObject({ directory: '/docs' });
  });

  it('sends the size option', async () => {
    let capturedVariables: unknown;

    mockPages((variables) => {
      capturedVariables = variables;
      return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
    });

    for await (const _ of client.pages.list({ size: 10 })) { /* empty */ }

    expect(capturedVariables).toMatchObject({ connection: { size: 10 } });
  });

  it('sends the auth header', async () => {
    let authHeader: string | null = null;

    mockPages((_, request) => {
      authHeader = request.headers.get('Authorization');
      return { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
    });

    for await (const _ of client.pages.list()) { /* empty */ }

    expect(authHeader).toBe('Bearer test-token');
  });
});
