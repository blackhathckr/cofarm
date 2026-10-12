import type { MilestoneTag, UpdateFeedItem } from '@cofarm/contracts/updates';
import { cn } from 'cn';
import { Chip } from 'heroui-native';
import { Pressable, Text, View } from 'react-native';

type UpdateFeedCardProps = {
  update: UpdateFeedItem;
  isOpen: boolean;
  isHighlighted: boolean;
  onPress: () => void;
};

function borderClass(isHighlighted: boolean, isOpen: boolean): string {
  if (isHighlighted) return 'border-2 border-clay-400';
  if (isOpen) return 'border border-clay-300';
  return 'border border-separator';
}

const TAG_LABELS: Record<MilestoneTag, string> = {
  land_prep: 'Land preparation',
  planting: 'Planting',
  growth: 'Growth',
  irrigation: 'Irrigation',
  nutrition: 'Nutrition',
  disease_mgmt: 'Crop protection',
  bunch_formation: 'Bunch formation',
  harvest: 'Harvest',
  general: 'General',
};

export function UpdateFeedCard({ update, isOpen, isHighlighted, onPress }: UpdateFeedCardProps) {
  const hasPhotos = update.photoCount > 0;

  return (
    <Pressable
      className={cn('gap-2 rounded-3xl bg-surface p-4', borderClass(isHighlighted, isOpen))}
      accessibilityRole="button"
      accessibilityLabel={`${update.title}. ${String(update.photoCount)} photographs.`}
      disabled={!hasPhotos}
      onPress={onPress}
    >
      {isHighlighted ? (
        <Text className="text-xs font-bold tracking-wider text-clay-700 uppercase">
          From your notification
        </Text>
      ) : null}

      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-xs font-bold tracking-wider text-muted uppercase">
          {update.activityDate}
        </Text>
        <Chip size="sm" variant="secondary">
          {TAG_LABELS[update.milestoneTag]}
        </Chip>
      </View>

      <Text className="text-base font-bold text-foreground">{update.title}</Text>
      <Text className="text-sm text-muted" numberOfLines={3}>
        {update.description}
      </Text>

      {hasPhotos ? (
        <Text className="text-xs font-bold text-clay-700">
          {isOpen
            ? 'Showing these photographs below'
            : `${String(update.photoCount)} photographs · tap to view`}
        </Text>
      ) : null}
    </Pressable>
  );
}
