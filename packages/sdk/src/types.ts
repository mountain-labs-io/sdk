export interface ClientOptions {
  token: string;
  baseUrl?: string;
  path?: string;
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
