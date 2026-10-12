import { cn } from 'cn';
import { Card } from 'heroui-native';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

type StatTileProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
};

export function StatTile({ label, value, hint, className }: StatTileProps) {
  return (
    <Card className={cn('flex-1 gap-1 p-4', className)}>
      <Text className="text-xs font-bold tracking-wider text-muted uppercase">{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text className="text-xl font-extrabold text-foreground">{value}</Text>
      ) : (
        value
      )}
      {hint === undefined ? null : <Text className="text-xs text-muted">{hint}</Text>}
    </Card>
  );
}
