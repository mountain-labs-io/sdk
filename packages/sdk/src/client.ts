import type { ClientOptions } from './types';
import { PagesResource } from './resources/pages';
import { SectionsResource } from './resources/sections';

export function createClient(options: ClientOptions) {
  const endpoint = `${options.baseUrl ?? 'https://api.mountain-labs.io'}${options.path ?? '/graphql'}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.token}`,
    'Content-Type': 'application/json',
  };

  const fetchFn = options.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));

  return {
    pages: new PagesResource(endpoint, headers, fetchFn),
    sections: new SectionsResource(endpoint, headers),
  };
}
