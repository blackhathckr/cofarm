import type { Cycle } from '@cofarm/contracts/projects';

import { ErrorNote } from '@/components/ErrorNote';
import { ProgressBar } from '@/components/ProgressBar';

import { useSetMilestone } from '../hooks/use-set-milestone.ts';
import { MilestoneStageCard, type MilestoneEdit } from './MilestoneStageCard';

type CycleMilestonesProps = {
  projectId: string;
  cycle: Cycle;
};

export function CycleMilestones({ projectId, cycle }: CycleMilestonesProps) {
  const setMilestone = useSetMilestone(projectId);

  const change = (stage: Cycle['milestones'][number]['stage'], edit: MilestoneEdit) => {
    setMilestone.mutate({
      cycleId: cycle.id,
      body: {
        stage,
        status: edit.status,
        ...(edit.actualFrom === null ? {} : { actualFrom: edit.actualFrom }),
        ...(edit.actualTo === null ? {} : { actualTo: edit.actualTo }),
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">Milestones</h3>
        {/* Stages carry unequal weights, so the figure comes from the server. */}
        <p className="tabular text-2xl font-bold text-sage-600">
          {`${Math.round(cycle.progressBps / 100).toString()}%`}
        </p>
      </div>

      <ProgressBar valueBps={cycle.progressBps} />

      <ol className="grid gap-2 sm:grid-cols-5">
        {cycle.milestones.map((milestone) => (
          <MilestoneStageCard
            key={milestone.id}
            milestone={milestone}
            disabled={setMilestone.isPending}
            onChange={(edit) => {
              change(milestone.stage, edit);
            }}
          />
        ))}
      </ol>

      <ErrorNote error={setMilestone.error} />
    </div>
  );
}
