import type { ClientOptions } from './types';
import { PagesResource } from './resources/pages';
import { SectionsResource } from './resources/sections';

export function createClient(options: ClientOptions) {
  const baseUrl = options.baseUrl ?? 'https://api.mountain-labs.io';

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.token}`,
    'Content-Type': 'application/json',
  };

  return {
    pages: new PagesResource(baseUrl, headers),
    sections: new SectionsResource(baseUrl, headers),
  };
}
