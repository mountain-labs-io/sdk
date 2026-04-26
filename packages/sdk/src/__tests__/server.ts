import { graphql, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { Page, PageId } from '../types';

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
