import type { ClientOptions } from './types';
import { PagesResource } from './resources/pages';
import { SectionsResource } from './resources/sections';
import { request } from './utils/graphql';

export function createClient(options: ClientOptions) {
  const endpoint = `${options.baseUrl ?? 'https://api.mountain-labs.io'}${options.path ?? '/graphql'}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.token}`,
    'Content-Type': 'application/json',
  };

  const fetchFn = options.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));

  function query<T>(queryString: string, variables?: Record<string, unknown>): Promise<T> {
    return request<T>(endpoint, headers, fetchFn, queryString, variables);
  }

  const pages = new PagesResource(query);

  return {
    pages,
    sections: new SectionsResource(pages),
    query,
  };
}
