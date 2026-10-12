import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';

type CursorPage = {
  items: readonly unknown[];
  nextCursor: string | null;
};

type CursorListOptions<TPage extends CursorPage> = {
  queryKey: QueryKey;
  fetchPage: (cursor: string | null) => Promise<TPage>;
  enabled?: boolean;
  /**
   * A transcript pages backwards into history: its first page holds the newest
   * entries, so the flattened list has to read the last page first.
   */
  isNewestFirst?: boolean;
  /**
   * Refetch interval for the newest page. Only that page is polled, so history
   * already paged in is left alone. Needs `identify` to merge the result.
   */
  pollNewestMs?: number;
  identify?: (item: TPage['items'][number]) => string;
};

type CursorList<TPage extends CursorPage> = UseInfiniteQueryResult<InfiniteData<TPage>> & {
  items: TPage['items'][number][];
};

/** Entries the poll returned that no loaded page held yet. */
function unseen(
  loaded: readonly unknown[],
  polled: readonly unknown[],
  identify: (item: unknown) => string,
): unknown[] {
  const held = new Set(loaded.map(identify));
  return polled.filter((item) => !held.has(identify(item)));
}

/**
 * Every paged endpoint answers with `items` and a keyset `nextCursor`, and
 * every call site wants the pages flattened, so both live here once.
 *
 * The signature is an overload because a property read off a type parameter
 * narrows to its constraint inside the body: callers keep the entry type,
 * while the body only ever sees `unknown` entries, which it never inspects.
 */
export function useCursorList<TPage extends CursorPage>(
  options: CursorListOptions<TPage>,
): CursorList<TPage>;
export function useCursorList(options: CursorListOptions<CursorPage>): CursorList<CursorPage> {
  const isEnabled = options.enabled ?? true;

  const query = useInfiniteQuery({
    queryKey: options.queryKey,
    queryFn: ({ pageParam }) => options.fetchPage(pageParam),
    enabled: isEnabled,
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });

  const newest = useQuery({
    queryKey: [...options.queryKey, 'newest'],
    queryFn: () => options.fetchPage(null),
    enabled: isEnabled && options.pollNewestMs !== undefined,
    ...(options.pollNewestMs === undefined ? {} : { refetchInterval: options.pollNewestMs }),
  });

  const pages = query.data?.pages ?? [];
  const ordered = options.isNewestFirst === true ? [...pages].reverse() : pages;
  const loaded = ordered.flatMap((page) => page.items);

  const identify = options.identify;
  if (identify === undefined || newest.data === undefined) {
    return { ...query, items: loaded };
  }

  const arrived = unseen(loaded, newest.data.items, identify);
  if (arrived.length === 0) return { ...query, items: loaded };

  return {
    ...query,
    items: options.isNewestFirst === true ? [...loaded, ...arrived] : [...arrived, ...loaded],
  };
}
