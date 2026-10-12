import type { MisSummary } from '@cofarm/contracts/mis';
import { Button, Card, Chip } from 'heroui-native';
import { Text, View } from 'react-native';

type MisLatestCardProps = {
  report: MisSummary;
  isOpening: boolean;
  onOpen: () => void;
};

export function MisLatestCard({ report, isOpening, onOpen }: MisLatestCardProps) {
  const publishedOn = report.publishedAt === null ? null : report.publishedAt.slice(0, 10);

  return (
    <Card className="gap-3 p-5">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-xs font-bold tracking-wider text-muted uppercase">Latest report</Text>
        {report.isNew ? (
          <Chip size="sm" color="warning">
            New
          </Chip>
        ) : null}
      </View>

      <View className="gap-1">
        <Text className="text-2xl font-extrabold text-foreground">{report.label}</Text>
        <Text className="text-sm text-muted">{report.title}</Text>
        <Text className="text-xs text-muted">
          {publishedOn === null ? 'Awaiting publication' : `Published ${publishedOn}`}
        </Text>
      </View>

      <Button isDisabled={isOpening} onPress={onOpen}>
        {isOpening ? 'Opening…' : 'View report'}
      </Button>
    </Card>
  );
}
