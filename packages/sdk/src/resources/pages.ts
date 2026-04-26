import type { PageListOptions, Page, QueryOptions } from '../types';
import { buildConnection, paginate } from '../utils/paginate';
import { resolveOptions, buildRef } from '../utils/graphql';

type RequestFn = <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;

const DEFAULT_FIELDS = `slug title publishedAt`;

export class PagesResource {
  constructor(private readonly request: RequestFn) {}

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
    const { nodeFields, opName } = resolveOptions(options, { fields: DEFAULT_FIELDS, operationName: 'ListPages' });
    const query = `query ${opName}($connection: ConnectionArgs, $directory: String) { pages(connection: $connection, directory: $directory) { edges { node { ${nodeFields} } } pageInfo { hasNextPage endCursor } } }`;

    yield* paginate<T>(async (cursor) => {
      const connection = buildConnection(cursor, options?.size);
      const result = await this.request<{ pages: { edges: Array<{ node: T }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } } }>(query, { connection, directory: options?.directory });
      return result.pages;
    });
  }

  async get<T = Page>(ref: string, options?: QueryOptions): Promise<T> {
    const { nodeFields, opName, decls, values } = resolveOptions(options, { fields: DEFAULT_FIELDS, operationName: 'GetPage' });
    const query = `query ${opName}($ref: SlugOrId!${decls}) { page(ref: $ref) { ${nodeFields} } }`;
    const result = await this.request<{ page: T | null }>(query, { ref: buildRef(ref, 'page_'), ...values });

    if (!result.page) {
      throw new Error(`Page not found: ${ref}`);
    }

    return result.page;
  }
}
