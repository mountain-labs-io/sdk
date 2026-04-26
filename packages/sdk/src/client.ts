import type { ClientOptions } from './types';
import { PagesResource } from './resources/pages';
import { SectionsResource } from './resources/sections';

export function createClient(options: ClientOptions) {
  const baseUrl = options.baseUrl ?? 'https://api.mountain-labs.io';

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.token}`,
    'Content-Type': 'application/json',
  };

  const fetchFn = options.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));

  return {
    pages: new PagesResource(baseUrl, headers, fetchFn),
    sections: new SectionsResource(baseUrl, headers),
  };
}
