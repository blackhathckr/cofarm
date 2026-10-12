import { Spinner } from 'heroui-native';
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
import { useHarvestView } from '../hooks/use-harvest-view.ts';

export function HarvestScreen() {
  const session = useSession();
  const memberships = session.user?.projects ?? [];
  const { projectId, select } = useSelectedProject();
  const view = useHarvestView(projectId);

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

  if (view.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  const { statement, awaited } = view;
  if (statement === null) {
    return (
      <View className="flex-1 bg-background">
        <View className="px-5 pt-3">{switcher}</View>
        <RefreshScreen isRefreshing={view.isRefreshing} onRefresh={view.refresh}>
          <NoStatementYet awaitedCycleNo={view.harvests.data?.at(-1)?.cycleNo ?? null} />
        </RefreshScreen>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="grow gap-5 px-5 pt-3 pb-10"
      refreshControl={<RefreshControl refreshing={view.isRefreshing} onRefresh={view.refresh} />}
    >
      {switcher}

      <Text className="text-sm text-muted">
        {`${statement.projectName} · ${statement.projectCode}`}
      </Text>

      <CycleSelector
        cycles={view.options}
        selectedCycleId={awaited?.id ?? statement.cycleId}
        onSelect={view.onSelectCycle}
      />

      {awaited === null ? (
        <>
          <LoadMore
            hasMore={view.statements.hasNextPage}
            isLoading={view.statements.isFetchingNextPage}
            label="Show earlier statements"
            onPress={() => {
              void view.statements.fetchNextPage();
            }}
          />

          <YieldStats statement={statement} />
          <PnlBreakdown statement={statement} />

          {view.totals === undefined ? null : <CumulativeCard totals={view.totals} />}

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
