import type { Cycle } from '@cofarm/contracts/projects';
import { useState } from 'react';

import { useCycleStatement } from './use-cycle-statement.ts';
import { useMyStatements } from './use-my-statements.ts';
import { useProjectCycles } from './use-project-cycles.ts';
import { useProjectHarvests } from './use-project-harvests.ts';

function pickStatement<TEntry extends { cycleId: string }>(
  entries: readonly TEntry[],
  cycleId: string | null,
): TEntry | null {
  return entries.find((entry) => entry.cycleId === cycleId) ?? entries[0] ?? null;
}

/** The chosen cycle when it has no statement yet, which is what the screen reports. */
function unsettledCycle(
  cycles: readonly Cycle[],
  published: readonly { cycleId: string }[],
  chosenCycleId: string | null,
): Cycle | null {
  if (chosenCycleId === null) return null;
  if (published.some((entry) => entry.cycleId === chosenCycleId)) return null;
  return cycles.find((entry) => entry.id === chosenCycleId) ?? null;
}

/**
 * Statements span every project the partner holds, so the screen narrows them
 * to the chosen one and works out whether the chosen cycle has settled yet.
 */
export function useHarvestView(projectId: string | null) {
  const [chosenCycleId, setChosenCycleId] = useState<string | null>(null);
  const statements = useMyStatements();
  const harvests = useProjectHarvests(projectId);
  const cycles = useProjectCycles(projectId);

  const published = statements.items.filter((statement) => statement.projectId === projectId);
  const allCycles = [...(cycles.data ?? [])].sort((left, right) => left.cycleNo - right.cycleNo);
  const chosen = pickStatement(published, chosenCycleId);
  const cycle = useCycleStatement(chosen?.projectId ?? null, chosen?.cycleId ?? null);

  const awaited = unsettledCycle(allCycles, published, chosenCycleId);

  return {
    statements,
    harvests,
    cycle,
    chosen,
    awaited,
    totals: statements.data?.pages[0]?.totals,
    statement: cycle.data ?? chosen,
    options: allCycles.map((entry) => ({
      cycleId: entry.id,
      cycleNo: entry.cycleNo,
      hasStatement: published.some((item) => item.cycleId === entry.id),
    })),
    onSelectCycle: setChosenCycleId,
    isPending: statements.isPending || harvests.isPending,
    isRefreshing: statements.isRefetching || harvests.isRefetching || cycle.isRefetching,
    refresh: () => {
      void Promise.all([statements.refetch(), harvests.refetch(), cycle.refetch()]);
    },
  };
}
