import { cn } from 'cn';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type KeyValueRowProps = {
  label: string;
  value: ReactNode;
  /** Emphasised rows carry a subtotal or the partner's own share. */
  emphasis?: boolean;
  className?: string;
};

export function KeyValueRow({ label, value, emphasis = false, className }: KeyValueRowProps) {
  return (
    <View
      className={cn(
        'flex-row items-baseline justify-between gap-3 border-b border-separator pb-2',
        className,
      )}
    >
      <Text className={cn('text-sm', emphasis ? 'font-bold text-foreground' : 'text-muted')}>
        {label}
      </Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text
          className={cn(
            'text-base',
            emphasis ? 'font-extrabold text-foreground' : 'font-bold text-foreground',
          )}
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}
