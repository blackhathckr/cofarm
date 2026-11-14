import type { CostLine } from '@cofarm/contracts/ledger';
import { useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { MoneyText } from '@/components/ui/MoneyText';

type CostCategoryRowProps = {
  label: string;
  amountPaise: string;
  lines: readonly CostLine[];
};

function lineLabel(line: CostLine): string {
  if (line.head === null) return 'Other';
  return line.subHead === null ? line.head : `${line.head} · ${line.subHead}`;
}

export function CostCategoryRow({ label, amountPaise, lines }: CostCategoryRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const muted = useThemeColor('muted');
  const canOpen = lines.length > 0;

  return (
    <View className="gap-2 border-b border-separator pb-2">
      <Pressable
        className="flex-row items-baseline justify-between gap-3"
        disabled={!canOpen}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen, disabled: !canOpen }}
        onPress={() => {
          setIsOpen((open) => !open);
        }}
      >
        <View className="flex-row items-center gap-1">
          <Text className="text-sm text-muted">{label}</Text>
          {canOpen ? (
            <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={14} color={muted} />
          ) : null}
        </View>
        <MoneyText paise={amountPaise} className="text-base font-bold text-foreground" />
      </Pressable>

      {isOpen ? (
        <View className="gap-1.5 rounded-xl bg-background px-3 py-2">
          {lines.map((line) => (
            <View
              key={`${line.head ?? ''}|${line.subHead ?? ''}`}
              className="flex-row items-baseline justify-between gap-3"
            >
              <Text className="flex-1 text-xs text-muted">{lineLabel(line)}</Text>
              <MoneyText
                paise={line.amountPaise}
                className="text-xs font-semibold text-foreground"
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
