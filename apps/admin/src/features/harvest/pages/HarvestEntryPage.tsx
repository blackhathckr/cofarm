import { useState } from 'react';

import { ErrorNote } from '@/components/ErrorNote';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectCycles } from '@/lib/project-cycles.ts';
import { HarvestForm } from '../components/HarvestForm';
import { PnlPreview } from '../components/PnlPreview';
import { useHarvests } from '../hooks/use-harvests.ts';

type HarvestEntryPageProps = {
  projectId: string;
  harvestId?: string;
};

export function HarvestEntryPage({ projectId, harvestId }: HarvestEntryPageProps) {
  const [savedId, setSavedId] = useState<string | null>(null);

  const cycles = useProjectCycles(projectId);
  const harvests = useHarvests(projectId);

  const activeId = harvestId ?? savedId;
  const active =
    activeId === null
      ? null
      : (harvests.data?.find((candidate) => candidate.id === activeId) ?? null);

  if (harvests.isPending || cycles.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (harvestId !== undefined && active === null) {
    return <p className="text-sm text-muted-foreground">That harvest could not be loaded.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {active === null ? 'Enter a harvest' : `Cycle ${active.cycleNo} harvest`}
        </h1>
        <p className="text-sm text-muted-foreground">
          Yield and the variety split are weights, the price is rupees per kg. Gross revenue is
          computed by the server from the two.
        </p>
      </div>

      <ErrorNote error={harvests.error ?? cycles.error} />

      <HarvestForm
        key={active?.id ?? 'new'}
        projectId={projectId}
        harvest={active}
        cycles={cycles.data ?? []}
        onSaved={(harvest) => {
          setSavedId(harvest.id);
        }}
      />

      {active === null ? null : <PnlPreview projectId={projectId} harvestId={active.id} />}
    </div>
  );
}
