interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface Connection<T> {
  edges: Array<{ node: T }>;
  pageInfo: PageInfo;
}

export function buildConnection(cursor: string | undefined, size: number | undefined) {
  return cursor !== undefined || size !== undefined
    ? { cursor, size }
    : undefined;
}

export async function* paginate<T>(
  fetch: (cursor: string | undefined) => Promise<Connection<T>>,
): AsyncIterable<T> {
  let cursor: string | undefined;

  do {
    const result = await fetch(cursor);

    for (const edge of result.edges) {
      yield edge.node;
    }

    cursor = result.pageInfo.hasNextPage
      ? (result.pageInfo.endCursor ?? undefined)
      : undefined;
  } while (cursor !== undefined);
}
