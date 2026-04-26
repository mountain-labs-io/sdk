import type { Page, QueryOptions } from '../types';

const DEFAULT_FIELDS = `slug title publishedAt`;

export class PagesResource {
  constructor(
    private readonly endpoint: string,
    private readonly headers: Record<string, string>,
    private readonly fetch: typeof globalThis.fetch,
  ) {}

  async get<T = Page>(ref: string, options?: QueryOptions): Promise<T> {
    const fields = options?.fields ?? DEFAULT_FIELDS;
    const query = `query GetPage($ref: SlugOrId!) { page(ref: $ref) { ${fields} } }`;
    const refVar = ref.startsWith('page_') ? { id: ref } : { slug: ref };
    const result = await this.request<{ page: T | null }>(query, { ref: refVar });

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
