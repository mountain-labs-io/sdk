export interface ClientOptions {
  token: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export type PageId = string & { readonly __brand: 'PageId' };

export interface Page {
  id: PageId;
  slug: string;
  title: string;
  publishedAt: string | null;
}

export interface QueryOptions {
  fields?: string;
}
