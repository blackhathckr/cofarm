import type { UpdateFeedItem } from '@cofarm/contracts/updates';
import { Pressable, Text, View } from 'react-native';

type LatestUpdateCardProps = {
  update: UpdateFeedItem | null;
  onPress: () => void;
};

export function LatestUpdateCard({ update, onPress }: LatestUpdateCardProps) {
  if (update === null) {
    return (
      <View className="gap-1 rounded-3xl bg-surface-secondary p-4">
        <Text className="text-xs font-bold tracking-wider text-muted uppercase">Latest update</Text>
        <Text className="text-sm text-muted">
          The field team posts progress here as your cycle moves along.
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      className="gap-1 rounded-3xl border border-separator bg-surface p-4"
      accessibilityRole="button"
      accessibilityLabel={`Latest update ${update.title}. Opens the project tab.`}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-xs font-bold tracking-wider text-muted uppercase">Latest update</Text>
        <Text className="text-xs font-bold text-muted">{update.activityDate}</Text>
      </View>

      <Text className="text-base font-bold text-foreground">{update.title}</Text>
      <Text className="text-sm text-muted" numberOfLines={2}>
        {update.description}
      </Text>
      <Text className="text-xs font-bold text-clay-700">
        {update.photoCount === 0
          ? 'Open in project'
          : `${String(update.photoCount)} photographs · open in project`}
      </Text>
    </Pressable>
  );
}
