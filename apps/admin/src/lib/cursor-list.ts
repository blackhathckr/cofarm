import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';

type KeysetPage = { items: readonly unknown[]; nextCursor: string | null };

type CursorListInput<TPage extends KeysetPage> = {
  queryKey: readonly unknown[];
  fetchPage: (cursor: string | undefined) => Promise<TPage>;
  enabled?: boolean;
  /** First page holds the newest entries, so page order reads last-first. */
  isNewestFirst?: boolean;
  /** Refetch interval for the newest page. History already paged in is left alone. */
  pollNewestMs?: number;
  identify?: (item: TPage['items'][number]) => string;
};

export type CursorPaging = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
};

type CursorListResult<TPage extends KeysetPage> = UseInfiniteQueryResult<InfiniteData<TPage>> & {
  pages: TPage[];
  firstPage: TPage | undefined;
  items: TPage['items'][number][];
};

/**
 * The API is keyset-paged throughout: a page carries its items and the cursor
 * of the next one. `firstPage` is kept reachable because some endpoints hang
 * whole-query figures off it — the ledger totals that exclude reversed pairs.
 */
export function useCursorList<TPage extends KeysetPage>(
  input: CursorListInput<TPage>,
): CursorListResult<TPage>;
export function useCursorList(input: CursorListInput<KeysetPage>): CursorListResult<KeysetPage> {
  const query = useInfiniteQuery({
    queryKey: input.queryKey,
    queryFn: ({ pageParam }) => input.fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: KeysetPage) => lastPage.nextCursor ?? undefined,
    ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
  });

  const newest = useQuery({
    queryKey: [...input.queryKey, 'newest'],
    queryFn: () => input.fetchPage(undefined),
    enabled: (input.enabled ?? true) && input.pollNewestMs !== undefined,
    ...(input.pollNewestMs === undefined ? {} : { refetchInterval: input.pollNewestMs }),
  });

  const pages = query.data?.pages ?? [];
  const ordered = input.isNewestFirst === true ? [...pages].reverse() : pages;
  const loaded = ordered.flatMap((page) => [...page.items]);

  const identify = input.identify;
  const arrived =
    identify === undefined || newest.data === undefined
      ? []
      : (() => {
          const held = new Set(loaded.map(identify));
          return newest.data.items.filter((item) => !held.has(identify(item)));
        })();

  return {
    ...query,
    pages,
    firstPage: newest.data ?? pages[0],
    items: arrived.length === 0 ? loaded : [...loaded, ...arrived],
  };
}
