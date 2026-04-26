import type { PageListOptions, Page, QueryOptions } from '../types';
import { buildConnection, paginate } from '../utils/paginate';
import { fields, buildRef, buildExtraVars } from '../utils/graphql';

const DEFAULT_FIELDS = `slug title publishedAt`;

export class PagesResource {
  constructor(
    private readonly endpoint: string,
    private readonly headers: Record<string, string>,
    private readonly fetch: typeof globalThis.fetch,
  ) {}

  async readMarkdown(pageRef: string): Promise<string> {
    const page = await this.get<{ sections: { edges: Array<{ node: { __typename: string; markdown?: string } }> } }>(pageRef, {
      fields: `sections { edges { node { ... on TextSection { markdown } } } }`,
    });
    return page.sections.edges
      .map((e) => e.node)
      .filter((n): n is { __typename: 'TextSection'; markdown: string } => n.__typename === 'TextSection')
      .map((n) => n.markdown)
      .join('\n\n');
  }

  async *list<T = Page>(options?: PageListOptions): AsyncIterable<T> {
    const nodeFields = fields(options?.fields ?? DEFAULT_FIELDS);
    const query = `query ListPages($connection: ConnectionArgs, $directory: String) { pages(connection: $connection, directory: $directory) { edges { node { ${nodeFields} } } pageInfo { hasNextPage endCursor } } }`;

    yield* paginate<T>(async (cursor) => {
      const connection = buildConnection(cursor, options?.size);
      const result = await this.request<{ pages: { edges: Array<{ node: T }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } } }>(query, { connection, directory: options?.directory });
      return result.pages;
    });
  }

  async get<T = Page>(ref: string, options?: QueryOptions): Promise<T> {
    const nodeFields = fields(options?.fields ?? DEFAULT_FIELDS);
    const { decls, values } = buildExtraVars(options?.variables);
    const query = `query GetPage($ref: SlugOrId!${decls}) { page(ref: $ref) { ${nodeFields} } }`;
    const result = await this.request<{ page: T | null }>(query, { ref: buildRef(ref, 'page_'), ...values });

    if (!result.page) {
      throw new Error(`Page not found: ${ref}`);
    }

    return result.page;
  }

  private async request<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await this.fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as { data?: T; errors?: Array<{ message: string }> };

    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).join(', '));
    }

    if (!json.data) {
      throw new Error('Unexpected empty response');
    }

    return json.data;
  }
}
