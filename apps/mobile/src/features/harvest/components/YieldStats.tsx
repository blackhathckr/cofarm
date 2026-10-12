import type { PartnerStatement } from '@cofarm/contracts/harvest';
import { View } from 'react-native';

import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { MoneyText } from '@/components/ui/MoneyText';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';

type YieldStatsProps = {
  statement: PartnerStatement;
};

const VALUE_CLASS = 'text-xl font-extrabold text-foreground';

export function YieldStats({ statement }: YieldStatsProps) {
  const varieties = Object.entries(statement.varietySplit);

  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <StatTile label="Total yield" value={`${statement.yieldKg} kg`} hint={statement.buyer} />
        <StatTile
          label="Sale price"
          value={<MoneyText paise={statement.pricePerKgPaise} className={VALUE_CLASS} />}
          hint="realised, per kg"
        />
      </View>

      <View className="flex-row gap-2">
        <StatTile
          label="Gross revenue"
          value={<MoneyText paise={statement.grossRevenuePaise} className={VALUE_CLASS} />}
          hint={`harvested ${statement.harvestedOn}`}
        />
        <StatTile
          label="Your share"
          value={<MoneyText paise={statement.sharePaise} className={VALUE_CLASS} />}
          hint="of net proceeds"
        />
      </View>

      {varieties.length === 0 ? null : (
        <View className="gap-2 rounded-3xl bg-surface p-4">
          <SectionHeader title="Yield by variety" />
          {varieties.map(([variety, kilograms]) => (
            <KeyValueRow key={variety} label={variety} value={`${kilograms} kg`} />
          ))}
        </View>
      )}
    </View>
  );
}
