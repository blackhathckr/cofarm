import type { PartnerCycle } from '@cofarm/contracts/dashboard';
import { MILESTONE_LABELS, MILESTONE_STAGES } from '@cofarm/core/cycle';
import { Chip } from 'heroui-native';
import { Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';

/** Short enough that all five stages fit one row. */
const SHORT_STAGE_LABELS: Readonly<Record<string, string>> = {
  land_prep: 'Land prep',
  planting: 'Planting',
  growth: 'Growth',
  bunch_formation: 'Bunch',
  harvest: 'Harvest',
};

type CycleProgressCardProps = {
  cycle: PartnerCycle | null;
};

export function CycleProgressCard({ cycle }: CycleProgressCardProps) {
  if (cycle === null) {
    return (
      <EmptyState
        title="No cycle has started"
        detail="Stage-by-stage progress appears here once planting begins."
      />
    );
  }

  return (
    <View className="gap-3 rounded-3xl bg-sage-100 p-5">
      <View className="flex-row items-center justify-between gap-3">
        <Chip>
          {cycle.activeStageLabel === null
            ? `Cycle ${String(cycle.cycleNo)}`
            : `Cycle ${String(cycle.cycleNo)} · ${cycle.activeStageLabel}`}
        </Chip>
        <Text className="text-lg font-extrabold text-sage-700">
          {`${String(Math.round(cycle.progressBps / 100))}%`}
        </Text>
      </View>

      <ProgressBar valueBps={cycle.progressBps} />

      <View className="flex-row justify-between">
        {MILESTONE_STAGES.map((stage) => (
          <Text
            key={stage}
            className={`text-[11px] font-bold ${
              cycle.activeStageLabel === MILESTONE_LABELS[stage] ? 'text-sage-700' : 'text-sage-400'
            }`}
          >
            {SHORT_STAGE_LABELS[stage] ?? MILESTONE_LABELS[stage]}
          </Text>
        ))}
      </View>
    </View>
  );
}
