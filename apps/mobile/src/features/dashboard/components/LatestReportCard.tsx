import type { MisLatest } from '@cofarm/contracts/mis';
import { Chip } from 'heroui-native';
import { Pressable, Text, View } from 'react-native';

type LatestReportCardProps = {
  report: MisLatest | null;
  onPress: () => void;
};

export function LatestReportCard({ report, onPress }: LatestReportCardProps) {
  if (report === null) {
    return (
      <View className="gap-1 rounded-3xl bg-surface-secondary p-4">
        <Text className="text-xs font-bold tracking-wider text-muted uppercase">Latest report</Text>
        <Text className="text-sm text-muted">
          Your first monthly report appears here once the Kiaan team publishes it.
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      className="gap-1 rounded-3xl border border-separator bg-surface p-4"
      accessibilityRole="button"
      accessibilityLabel={`Latest report ${report.label}. Opens the MIS tab.`}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-xs font-bold tracking-wider text-muted uppercase">Latest report</Text>
        {report.isNew ? (
          <Chip size="sm" color="warning">
            New
          </Chip>
        ) : null}
      </View>

      <Text className="text-base font-bold text-foreground">{report.label}</Text>
      <Text className="text-sm text-muted" numberOfLines={1}>
        {report.title}
      </Text>
      <Text className="text-xs font-bold text-clay-700">Open in MIS</Text>
    </Pressable>
  );
}
