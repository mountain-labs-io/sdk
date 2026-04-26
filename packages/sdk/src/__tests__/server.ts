import { graphql, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { Page, PageId, Section } from '../types';

export const server = setupServer();

// Pages

type GetPageVariables = { ref: { slug?: string; id?: PageId } };
type PageResolver = (variables: GetPageVariables, request: Request) => Partial<Page>;

export function mockPage(dataOrResolver: Partial<Page> | PageResolver | null): void {
  server.use(
    graphql.query('GetPage', ({ variables, request }) => {
      const data =
        typeof dataOrResolver === 'function'
          ? dataOrResolver(variables as GetPageVariables, request)
          : dataOrResolver;
      return HttpResponse.json({ data: { page: data } });
    }),
  );
}

export function mockPageGraphQLError(message: string): void {
  server.use(
    graphql.query('GetPage', () => HttpResponse.json({ errors: [{ message }] })),
  );
}

export function mockPageHttpError(status: number): void {
  server.use(
    graphql.query('GetPage', () => new HttpResponse(null, { status })),
  );
}

type ListPagesVariables = { connection?: { cursor?: string; size?: number }; directory?: string };
type PageConnection = { edges: Array<{ node: Partial<Page> }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
type PagesResolver = (variables: ListPagesVariables, request: Request) => PageConnection;

export function mockPages(dataOrResolver: PageConnection | PagesResolver): void {
  server.use(
    graphql.query('ListPages', ({ variables, request }) => {
      const data =
        typeof dataOrResolver === 'function'
          ? dataOrResolver(variables as ListPagesVariables, request)
          : dataOrResolver;
      return HttpResponse.json({ data: { pages: data } });
    }),
  );
}

// Sections

type GetSectionVariables = { ref: { slug?: string; id?: string }; sectionRef: { slug?: string; id?: string } };
type SectionResolver = (variables: GetSectionVariables, request: Request) => Partial<Section>;

export function mockSection(dataOrResolver: Partial<Section> | SectionResolver | null, pageFound = true): void {
  server.use(
    graphql.query('GetSection', ({ variables, request }) => {
      if (!pageFound) return HttpResponse.json({ data: { page: null } });
      const section =
        typeof dataOrResolver === 'function'
          ? dataOrResolver(variables as GetSectionVariables, request)
          : dataOrResolver;
      return HttpResponse.json({ data: { page: { section } } });
    }),
  );
}

export function mockSectionGraphQLError(message: string): void {
  server.use(
    graphql.query('GetSection', () => HttpResponse.json({ errors: [{ message }] })),
  );
}

export function mockSectionHttpError(status: number): void {
  server.use(
    graphql.query('GetSection', () => new HttpResponse(null, { status })),
  );
}

type ListSectionsVariables = { ref: { slug: string } };
type SectionEdges = { edges: Array<{ node: Partial<Section> }> };
type SectionsResolver = (variables: ListSectionsVariables, request: Request) => SectionEdges;

export function mockSections(dataOrResolver: SectionEdges | SectionsResolver | null): void {
  server.use(
    graphql.query('ListSections', ({ variables, request }) => {
      if (dataOrResolver === null) return HttpResponse.json({ data: { page: null } });
      const sections =
        typeof dataOrResolver === 'function'
          ? dataOrResolver(variables as ListSectionsVariables, request)
          : dataOrResolver;
      return HttpResponse.json({ data: { page: { sections } } });
    }),
  );
}

export function mockSectionsGraphQLError(message: string): void {
  server.use(
    graphql.query('ListSections', () => HttpResponse.json({ errors: [{ message }] })),
  );
}

export function mockSectionsHttpError(status: number): void {
  server.use(
    graphql.query('ListSections', () => new HttpResponse(null, { status })),
  );
}
