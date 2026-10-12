import type { ActivityEntry } from '@cofarm/contracts/updates';
import { Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { LoadMore } from '@/components/ui/LoadMore';
import { SectionHeader } from '@/components/ui/SectionHeader';

type ActivityLogProps = {
  entries: readonly ActivityEntry[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
};

export function ActivityLog({ entries, hasMore, isLoadingMore, onLoadMore }: ActivityLogProps) {
  return (
    <View className="gap-3">
      <SectionHeader title="Activity log" />

      {entries.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          detail="Day-to-day operations on your farm will be listed here."
        />
      ) : (
        <View className="gap-3 rounded-3xl bg-surface p-4">
          {entries.map((entry) => (
            <View key={entry.id} className="gap-1 border-b border-separator pb-3">
              <Text className="text-xs font-bold tracking-wider text-muted uppercase">
                {entry.activityDate}
              </Text>
              <Text className="text-base font-bold text-foreground">{entry.title}</Text>
              {entry.detail === null ? null : (
                <Text className="text-sm text-muted">{entry.detail}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      <LoadMore
        hasMore={hasMore}
        isLoading={isLoadingMore}
        label="Show earlier activity"
        onPress={onLoadMore}
      />
    </View>
  );
}
