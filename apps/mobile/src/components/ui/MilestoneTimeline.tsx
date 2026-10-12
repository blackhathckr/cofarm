import type { Milestone } from '@cofarm/contracts/projects';
import { cn } from 'cn';
import { Text, View } from 'react-native';

type MilestoneTimelineProps = {
  milestones: readonly Milestone[];
};

const DOT: Record<Milestone['status'], string> = {
  done: 'bg-sage-600',
  active: 'bg-clay-500',
  upcoming: 'bg-sand-300',
};

const RING: Record<Milestone['status'], string> = {
  done: 'bg-sage-200',
  active: 'bg-clay-200',
  upcoming: 'bg-sand-100',
};

const LABEL: Record<Milestone['status'], string> = {
  done: 'text-foreground',
  active: 'text-clay-800',
  upcoming: 'text-muted',
};

const TAG: Record<Milestone['status'], string> = {
  done: 'Done',
  active: 'Now',
  upcoming: 'Upcoming',
};

export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  return (
    <View className="gap-0">
      {milestones.map((milestone, index) => (
        <View key={milestone.id} className="flex-row gap-3">
          <View className="w-6 items-center pt-1">
            <View
              className={cn(
                'h-5 w-5 items-center justify-center rounded-full',
                RING[milestone.status],
              )}
            >
              <View className={cn('h-2.5 w-2.5 rounded-full', DOT[milestone.status])} />
            </View>
            {index === milestones.length - 1 ? null : <View className="w-0.5 flex-1 bg-sand-200" />}
          </View>

          <View className="flex-1 pb-5">
            <View className="flex-row items-center gap-2">
              <Text className={cn('text-base font-bold', LABEL[milestone.status])}>
                {milestone.label}
              </Text>
              <Text
                className={cn(
                  'overflow-hidden rounded-full px-2 py-0.5 text-xs font-bold',
                  RING[milestone.status],
                  LABEL[milestone.status],
                )}
              >
                {TAG[milestone.status]}
              </Text>
            </View>
            <Text className="text-sm text-muted">
              {milestone.actualFrom ?? milestone.plannedFrom ?? 'Date to be confirmed'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
