import type { UpdateFeedItem } from '@cofarm/contracts/updates';
import { View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { LoadMore } from '@/components/ui/LoadMore';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { UpdateFeedCard } from './UpdateFeedCard';

type UpdateFeedProps = {
  updates: readonly UpdateFeedItem[];
  openUpdateId: string | null;
  highlightUpdateId: string | null;
  onOpenPhotos: (updateId: string) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
};

/** The update a notification pointed at leads the feed, so it needs no hunting. */
function highlightedFirst(
  updates: readonly UpdateFeedItem[],
  highlightUpdateId: string | null,
): readonly UpdateFeedItem[] {
  const highlighted = updates.find((update) => update.id === highlightUpdateId);
  if (highlighted === undefined) return updates;

  return [highlighted, ...updates.filter((update) => update.id !== highlighted.id)];
}

export function UpdateFeed({
  updates,
  openUpdateId,
  highlightUpdateId,
  onOpenPhotos,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: UpdateFeedProps) {
  const ordered = highlightedFirst(updates, highlightUpdateId);

  return (
    <View className="gap-3">
      <SectionHeader title="Recent updates" />

      {updates.length === 0 ? (
        <EmptyState
          title="No updates yet"
          detail="The field team posts progress here as your cycle moves along."
        />
      ) : (
        ordered.map((update) => (
          <UpdateFeedCard
            key={update.id}
            update={update}
            isOpen={update.id === openUpdateId}
            isHighlighted={update.id === highlightUpdateId}
            onPress={() => {
              onOpenPhotos(update.id);
            }}
          />
        ))
      )}

      <LoadMore
        hasMore={hasMore}
        isLoading={isLoadingMore}
        label="Show earlier updates"
        onPress={onLoadMore}
      />
    </View>
  );
}
