/** Context passed to every {@link AuthInterceptor} call. */
export interface AuthInterceptorContext {
  /** The fetch implementation configured on the client. */
  fetch: typeof globalThis.fetch;
  /** Resolved auth base URL for the client's project. */
  authUrl: string;
}

/**
 * A function that receives outgoing request headers and returns a (possibly modified) copy.
 * Use this to attach credentials — return `{ ...headers, Authorization: 'Bearer ...' }`.
 * May be async.
 */
export type AuthInterceptor = (
  headers: Record<string, string>,
  ctx: AuthInterceptorContext,
) => Record<string, string> | Promise<Record<string, string>>;

export interface ClientOptions {
  /** Auth interceptor. Omit for unauthenticated (public) access. */
  auth?: AuthInterceptor;
  /**
   * Your Mountain Labs project. Accepts a plain identifier (e.g. `'acme'`) or a project URL
   * (e.g. `'https://acme.mountain-labs.io'`, `'https://graph.acme.mountain-labs.io'`).
   * Derives `graphUrl` and `authUrl` automatically unless those are set explicitly.
   */
  project: string;
  /** GraphQL endpoint. Takes precedence over `project`. */
  graphUrl?: string;
  /** Auth base URL. Takes precedence over `project`. */
  authUrl?: string;
  /** Custom fetch implementation. Defaults to `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch;
}

export type PageId = string & { readonly __brand: 'PageId' };

export interface Page {
  id: PageId;
  slug: string;
  title: string;
  publishedAt: string | null;
}

export type SectionId = string & { readonly __brand: 'SectionId' };

export interface Section {
  id: SectionId;
  slug: string;
  name: string;
}

export interface QueryOptions {
  fields?: string;
  operationName?: string;
  variables?: Record<string, { type: string; value: unknown }>;
}

export interface PageListOptions extends QueryOptions {
  directory?: string;
  size?: number;
}
