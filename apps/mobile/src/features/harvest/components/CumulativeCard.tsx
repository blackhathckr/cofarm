import type { StatementTotals } from '@cofarm/contracts/harvest';
import { returnBasisPoints } from '@cofarm/core/pnl';
import { Text, View } from 'react-native';

import { MoneyText } from '@/components/ui/MoneyText';
import { formatBasisPoints } from '../basis-points.ts';

type CumulativeCardProps = {
  totals: StatementTotals;
};

export function CumulativeCard({ totals }: CumulativeCardProps) {
  const overallBps = returnBasisPoints(
    BigInt(totals.totalContributedPaise),
    BigInt(totals.totalEarnedPaise),
  );

  return (
    <View className="gap-3 rounded-3xl bg-sage-100 p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold tracking-wider text-sage-700 uppercase">
          Across every cycle
        </Text>
        <Text className="text-lg font-extrabold text-sage-700">
          {formatBasisPoints(overallBps)}
        </Text>
      </View>

      <View className="flex-row gap-2">
        <View className="flex-1 gap-1">
          <Text className="text-xs font-bold text-sage-600">Total contributed</Text>
          <MoneyText
            paise={totals.totalContributedPaise}
            className="text-xl font-extrabold text-sage-800"
          />
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-xs font-bold text-sage-600">Total earned</Text>
          <MoneyText
            paise={totals.totalEarnedPaise}
            className="text-xl font-extrabold text-sage-800"
          />
        </View>
      </View>

      <Text className="text-xs text-sage-600">Overall return on the money you have put in.</Text>
    </View>
  );
}
