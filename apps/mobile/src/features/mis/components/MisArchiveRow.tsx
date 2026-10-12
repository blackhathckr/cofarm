import type { MisSummary } from '@cofarm/contracts/mis';
import { Chip } from 'heroui-native';
import { Pressable, Text, View } from 'react-native';

type MisArchiveRowProps = {
  report: MisSummary;
  isOpening: boolean;
  onPress: () => void;
};

export function MisArchiveRow({ report, isOpening, onPress }: MisArchiveRowProps) {
  const publishedOn = report.publishedAt === null ? null : report.publishedAt.slice(0, 10);

  return (
    <Pressable
      className="flex-row items-center justify-between gap-3 rounded-2xl bg-surface p-4"
      accessibilityRole="button"
      accessibilityLabel={`${report.label}. ${report.isRead ? 'Viewed' : 'Not yet viewed'}.`}
      disabled={isOpening}
      onPress={onPress}
    >
      <View className="flex-1 gap-1">
        <Text className="text-base font-bold text-foreground">{report.label}</Text>
        <Text className="text-xs text-muted" numberOfLines={1}>
          {publishedOn === null ? report.title : `${report.title} · ${publishedOn}`}
        </Text>
      </View>

      <Chip size="sm" variant="secondary" color={report.isRead ? 'default' : 'warning'}>
        {report.isRead ? 'Viewed' : 'New'}
      </Chip>
    </Pressable>
  );
}
