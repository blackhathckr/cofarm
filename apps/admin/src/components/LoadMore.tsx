import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { CursorPaging } from '@/lib/cursor-list.ts';

type LoadMoreProps = {
  paging: CursorPaging;
  label: string;
};

export function LoadMore({ paging, label }: LoadMoreProps) {
  if (!paging.hasNextPage) return null;

  return (
    <div className="flex justify-center py-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={paging.isFetchingNextPage}
        onClick={() => {
          void paging.fetchNextPage();
        }}
      >
        {paging.isFetchingNextPage ? <Skeleton className="size-4 rounded-full" /> : null}
        {paging.isFetchingNextPage ? 'Loading…' : label}
      </Button>
    </div>
  );
}
