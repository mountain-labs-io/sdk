import { describe, it, expect } from 'vitest';
import { createClient } from '../client';
import {
  mockSection,
  mockSectionGraphQLError,
  mockSectionHttpError,
  mockSections,
  mockSectionsGraphQLError,
  mockSectionsHttpError,
} from './server';

const client = createClient({ token: 'test-token' });

describe('sections.get', () => {
  it('fetches a section by slug', async () => {
    mockSection({ slug: 'intro', name: 'Introduction' });

    const section = await client.sections.get('home', 'intro');

    expect(section.slug).toBe('intro');
    expect(section.name).toBe('Introduction');
  });

  it('sends slug ref for non-id page argument', async () => {
    let capturedVariables: unknown;

    mockSection((variables) => {
      capturedVariables = variables;
      return { slug: 'intro', name: 'Introduction' };
    });

    await client.sections.get('home', 'intro');

    expect(capturedVariables).toMatchObject({ ref: { slug: 'home' } });
  });

  it('sends id ref for page_ prefixed page argument', async () => {
    let capturedVariables: unknown;

    mockSection((variables) => {
      capturedVariables = variables;
      return { slug: 'intro', name: 'Introduction' };
    });

    await client.sections.get('page_abc123', 'intro');

    expect(capturedVariables).toMatchObject({ ref: { id: 'page_abc123' } });
  });

  it('sends slug ref for non-id section argument as a variable', async () => {
    let capturedVariables: unknown;

    mockSection((variables) => {
      capturedVariables = variables;
      return { slug: 'intro', name: 'Introduction' };
    });

    await client.sections.get('home', 'intro');

    expect(capturedVariables).toMatchObject({ sectionRef: { slug: 'intro' } });
  });

  it('sends id ref for sct_ prefixed section argument as a variable', async () => {
    let capturedVariables: unknown;

    mockSection((variables) => {
      capturedVariables = variables;
      return { slug: 'intro', name: 'Introduction' };
    });

    await client.sections.get('home', 'sct_abc123');

    expect(capturedVariables).toMatchObject({ sectionRef: { id: 'sct_abc123' } });
  });

  it('supports custom fields', async () => {
    mockSection({ slug: 'intro' });

    const section = await client.sections.get<{ slug: string }>('home', 'intro', { fields: 'slug' });

    expect(section.slug).toBe('intro');
  });

  it('always includes __typename in the query', async () => {
    let query = '';

    mockSection((_, request) => {
      request.json().then((body: { query: string }) => { query = body.query; });
      return { slug: 'intro', name: 'Introduction' };
    });

    await client.sections.get('home', 'intro');

    expect(query).toContain('__typename');
  });

  it('throws when page is not found', async () => {
    mockSection(null, false);

    await expect(client.sections.get('missing', 'intro')).rejects.toThrow('Page not found: missing');
  });

  it('throws when section is not found', async () => {
    mockSection(null);

    await expect(client.sections.get('home', 'missing')).rejects.toThrow('Section not found: home/missing');
  });

  it('throws on GraphQL errors', async () => {
    mockSectionGraphQLError('Unauthorised');

    await expect(client.sections.get('home', 'intro')).rejects.toThrow('Unauthorised');
  });

  it('throws on HTTP errors', async () => {
    mockSectionHttpError(401);

    await expect(client.sections.get('home', 'intro')).rejects.toThrow('401');
  });

  it('sends the auth header', async () => {
    let authHeader: string | null = null;

    mockSection((_, request) => {
      authHeader = request.headers.get('Authorization');
      return { slug: 'intro', name: 'Introduction' };
    });

    await client.sections.get('home', 'intro');

    expect(authHeader).toBe('Bearer test-token');
  });
});

describe('sections.list', () => {
  it('yields all sections', async () => {
    mockSections({
      edges: [
        { node: { slug: 'intro', name: 'Introduction' } },
        { node: { slug: 'body', name: 'Body' } },
      ],
    });

    const sections = [];
    for await (const section of client.sections.list('home')) {
      sections.push(section);
    }

    expect(sections).toHaveLength(2);
    expect(sections[0].slug).toBe('intro');
    expect(sections[1].slug).toBe('body');
  });

  it('yields sections in the order returned by the server', async () => {
    mockSections({
      edges: [
        { node: { slug: 'a', name: 'A' } },
        { node: { slug: 'b', name: 'B' } },
        { node: { slug: 'c', name: 'C' } },
      ],
    });

    const slugs = [];
    for await (const section of client.sections.list('home')) {
      slugs.push(section.slug);
    }

    expect(slugs).toEqual(['a', 'b', 'c']);
  });

  it('sends the correct page ref as a variable', async () => {
    let capturedVariables: unknown;

    mockSections((variables) => {
      capturedVariables = variables;
      return { edges: [] };
    });

    for await (const _ of client.sections.list('docs')) { /* empty */ }

    expect(capturedVariables).toMatchObject({ ref: { slug: 'docs' } });
  });

  it('supports custom fields', async () => {
    mockSections({ edges: [{ node: { slug: 'intro' } }] });

    const sections = [];
    for await (const section of client.sections.list<{ slug: string }>('home', { fields: 'slug' })) {
      sections.push(section);
    }

    expect(sections[0].slug).toBe('intro');
  });

  it('always includes __typename in the query', async () => {
    let query = '';

    mockSections((_, request) => {
      request.json().then((body: { query: string }) => { query = body.query; });
      return { edges: [] };
    });

    for await (const _ of client.sections.list('home')) { /* empty */ }

    expect(query).toContain('__typename');
  });

  it('yields nothing for an empty page', async () => {
    mockSections({ edges: [] });

    const sections = [];
    for await (const section of client.sections.list('home')) {
      sections.push(section);
    }

    expect(sections).toHaveLength(0);
  });

  it('throws when page is not found', async () => {
    mockSections(null);

    const collect = async () => { for await (const _ of client.sections.list('missing')) { /* empty */ } };
    await expect(collect()).rejects.toThrow('Page not found: missing');
  });

  it('throws on GraphQL errors', async () => {
    mockSectionsGraphQLError('Unauthorised');

    const collect = async () => { for await (const _ of client.sections.list('home')) { /* empty */ } };
    await expect(collect()).rejects.toThrow('Unauthorised');
  });

  it('throws on HTTP errors', async () => {
    mockSectionsHttpError(401);

    const collect = async () => { for await (const _ of client.sections.list('home')) { /* empty */ } };
    await expect(collect()).rejects.toThrow('401');
  });

  it('sends the auth header', async () => {
    let authHeader: string | null = null;

    mockSections((_, request) => {
      authHeader = request.headers.get('Authorization');
      return { edges: [] };
    });

    for await (const _ of client.sections.list('home')) { /* empty */ }

    expect(authHeader).toBe('Bearer test-token');
  });
});
