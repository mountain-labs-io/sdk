import type { ClientOptions } from './types';
import { PagesResource } from './resources/pages';
import { SectionsResource } from './resources/sections';
import { request } from './utils/graphql';

const MOUNTAIN_LABS_HOST_RE = /^(?:(?:graph|auth)\.)?([^.]+)\.mountain-labs\.io$/;

function resolveProject(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value; // plain identifier
  }
  const match = url.hostname.match(MOUNTAIN_LABS_HOST_RE);
  if (!match) {
    throw new Error(
      `Invalid project URL "${value}". Expected a mountain-labs.io host (e.g. https://acme.mountain-labs.io).`,
    );
  }
  return match[1];
}

/**
 * Creates a Mountain Labs SDK client.
 *
 * @example
 * const { pages, sections } = createClient({ project: 'acme', auth: bearerAuth('token') });
 */
export function createClient(options: ClientOptions) {
  const project = resolveProject(options.project);
  const graphUrl = options.graphUrl ?? `https://graph.${project}.mountain-labs.io/graphql`;
  const authUrl = options.authUrl ?? `https://auth.${project}.mountain-labs.io`;
  const fetchFn = options.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));

  async function query<T>(queryString: string, variables?: Record<string, unknown>): Promise<T> {
    const baseHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    const headers = options.auth
      ? await options.auth(baseHeaders, { fetch: fetchFn, authUrl })
      : baseHeaders;
    return request<T>(graphUrl, headers, fetchFn, queryString, variables);
  }

  const pages = new PagesResource(query);

  return {
    pages,
    sections: new SectionsResource(pages),
    query,
  };
}
