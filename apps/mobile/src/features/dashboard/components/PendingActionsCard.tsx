import { Pressable, Text, View } from 'react-native';

type PendingActionsCardProps = {
  count: number;
  onPress: () => void;
};

export function PendingActionsCard({ count, onPress }: PendingActionsCardProps) {
  if (count === 0) return null;

  return (
    <Pressable
      className="flex-row items-center justify-between gap-3 rounded-3xl border border-separator bg-surface p-4"
      accessibilityRole="button"
      accessibilityLabel={`${String(count)} awaiting your signature. Opens chat.`}
      onPress={onPress}
    >
      <View className="flex-1 gap-1">
        <Text className="text-xs font-bold tracking-wider text-muted uppercase">Awaiting you</Text>
        <Text className="text-base font-bold text-foreground">
          {count === 1
            ? '1 document awaiting your signature'
            : `${String(count)} documents awaiting your signature`}
        </Text>
      </View>
      <Text className="text-xs font-bold text-clay-700">Review</Text>
    </Pressable>
  );
}
