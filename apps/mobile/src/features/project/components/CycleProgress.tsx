import type { Cycle } from '@cofarm/contracts/projects';
import { Text, View } from 'react-native';

import { ProgressBar } from '@/components/ui/ProgressBar';

type CycleProgressProps = {
  cycle: Cycle;
};

export function CycleProgress({ cycle }: CycleProgressProps) {
  return (
    <View className="gap-4 rounded-3xl bg-sage-100 p-5">
      <View className="flex-row items-end justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-xs font-bold tracking-wider text-sage-600 uppercase">
            {`Cycle ${String(cycle.cycleNo)} progress`}
          </Text>
          <Text className="text-sm text-sage-700">
            {cycle.expectedHarvestFrom === null
              ? 'Harvest window to be confirmed'
              : `Harvest from ${cycle.expectedHarvestFrom}`}
          </Text>
        </View>
        <Text className="text-2xl font-extrabold text-sage-700">
          {`${String(Math.round(cycle.progressBps / 100))}%`}
        </Text>
      </View>

      <ProgressBar valueBps={cycle.progressBps} />
    </View>
  );
}
