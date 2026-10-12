import { Spinner } from 'heroui-native';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { LoadMore } from '@/components/ui/LoadMore';
import { ProjectSwitcher } from '@/components/ui/ProjectSwitcher';
import { RefreshScreen } from '@/components/ui/RefreshScreen';
import { useSession } from '@/features/auth/hooks/use-session.ts';
import { useSelectedProject } from '@/lib/selected-project.ts';
import { CumulativeCard } from '../components/CumulativeCard';
import { CycleSelector } from '../components/CycleSelector';
import { ExportStatementButton } from '../components/ExportStatementButton';
import { NoStatementYet } from '../components/NoStatementYet';
import { PnlBreakdown } from '../components/PnlBreakdown';
import { YieldStats } from '../components/YieldStats';
import { useCycleStatement } from '../hooks/use-cycle-statement.ts';
import { useMyStatements } from '../hooks/use-my-statements.ts';
import { useProjectCycles } from '../hooks/use-project-cycles.ts';
import { useProjectHarvests } from '../hooks/use-project-harvests.ts';

function pickStatement<TEntry extends { cycleId: string }>(
  entries: readonly TEntry[],
  cycleId: string | null,
): TEntry | null {
  return entries.find((entry) => entry.cycleId === cycleId) ?? entries[0] ?? null;
}

export function HarvestScreen() {
  const session = useSession();
  const memberships = session.user?.projects ?? [];
  const { projectId, select } = useSelectedProject();

  const [chosenCycleId, setChosenCycleId] = useState<string | null>(null);
  const statements = useMyStatements();
  const harvests = useProjectHarvests(projectId);
  const cycles = useProjectCycles(projectId);

  const published = statements.items.filter((statement) => statement.projectId === projectId);
  const totals = statements.data?.pages[0]?.totals;
  const allCycles = [...(cycles.data ?? [])].sort((left, right) => left.cycleNo - right.cycleNo);
  const chosen = pickStatement(published, chosenCycleId);
  const awaited =
    chosenCycleId === null || published.some((entry) => entry.cycleId === chosenCycleId)
      ? null
      : (allCycles.find((entry) => entry.id === chosenCycleId) ?? null);
  const cycle = useCycleStatement(chosen?.projectId ?? null, chosen?.cycleId ?? null);

  const switcher = (
    <ProjectSwitcher
      projects={memberships.map((membership) => ({
        id: membership.projectId,
        code: membership.code,
        name: membership.name,
      }))}
      selectedId={projectId ?? ''}
      onSelect={select}
    />
  );

  if (statements.isPending || harvests.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (chosen === null) {
    return (
      <View className="flex-1 bg-background">
        <View className="px-5 pt-3">{switcher}</View>
        <RefreshScreen
          isRefreshing={statements.isRefetching || harvests.isRefetching}
          onRefresh={() => {
            void Promise.all([statements.refetch(), harvests.refetch()]);
          }}
        >
          <NoStatementYet awaitedCycleNo={harvests.data?.at(-1)?.cycleNo ?? null} />
        </RefreshScreen>
      </View>
    );
  }

  const statement = cycle.data ?? chosen;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="grow gap-5 px-5 pt-3 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={statements.isRefetching || cycle.isRefetching}
          onRefresh={() => {
            void Promise.all([statements.refetch(), cycle.refetch(), harvests.refetch()]);
          }}
        />
      }
    >
      {switcher}

      <Text className="text-sm text-muted">
        {`${statement.projectName} · ${statement.projectCode}`}
      </Text>

      <CycleSelector
        cycles={allCycles.map((entry) => ({
          cycleId: entry.id,
          cycleNo: entry.cycleNo,
          hasStatement: published.some((item) => item.cycleId === entry.id),
        }))}
        selectedCycleId={awaited?.id ?? statement.cycleId}
        onSelect={setChosenCycleId}
      />

      {awaited === null ? (
        <>
          <LoadMore
            hasMore={statements.hasNextPage}
            isLoading={statements.isFetchingNextPage}
            label="Show earlier statements"
            onPress={() => {
              void statements.fetchNextPage();
            }}
          />

          <YieldStats statement={statement} />
          <PnlBreakdown statement={statement} />

          {totals === undefined ? null : <CumulativeCard totals={totals} />}

          <ExportStatementButton statement={statement} />
        </>
      ) : (
        <View className="flex-1 justify-center">
          <EmptyState
            title={`Cycle ${String(awaited.cycleNo)} is not settled yet`}
            detail="Your statement appears here once the Kiaan team publishes this cycle's harvest."
          />
        </View>
      )}
    </ScrollView>
  );
}
