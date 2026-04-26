import { graphql, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { Page, PageId } from '../types';

type ListPagesVariables = { connection?: { cursor?: string; size?: number }; directory?: string };
type PageConnection = { edges: Array<{ node: Partial<Page> }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
type PagesResolver = (variables: ListPagesVariables, request: Request) => PageConnection;

export const server = setupServer();

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
