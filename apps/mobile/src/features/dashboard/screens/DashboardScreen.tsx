import { router } from 'expo-router';
import { Spinner } from 'heroui-native';
import { RefreshControl, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { RefreshScreen } from '@/components/ui/RefreshScreen';
import { ProjectSwitcher } from '@/components/ui/ProjectSwitcher';
import { useSession } from '@/features/auth/hooks/use-session.ts';
import { useSelectedProject } from '@/lib/selected-project.ts';
import { ContributionSummary } from '../components/ContributionSummary';
import { CycleProgressCard } from '../components/CycleProgressCard';
import { DashboardGreeting } from '../components/DashboardGreeting';
import { LatestReportCard } from '../components/LatestReportCard';
import { LatestUpdateCard } from '../components/LatestUpdateCard';
import { NotificationBanner } from '../components/NotificationBanner';
import { PendingActionsCard } from '../components/PendingActionsCard';
import { useLatestMisReport } from '../hooks/use-latest-mis-report.ts';
import { useLatestUpdate } from '../hooks/use-latest-update.ts';
import { usePartnerDashboard } from '../hooks/use-partner-dashboard.ts';
import { useOpenNotification } from '@/features/notifications/hooks/use-open-notification.ts';

export function DashboardScreen() {
  const session = useSession();
  const dashboard = usePartnerDashboard();
  const openNotification = useOpenNotification();
  const { projectId, select } = useSelectedProject();

  const projects = dashboard.data?.projects ?? [];
  const selected = projects.find((card) => card.projectId === projectId) ?? projects[0];
  const latestReport = useLatestMisReport(selected?.projectId ?? null);
  const latestUpdate = useLatestUpdate(selected?.projectId ?? null);

  if (dashboard.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (dashboard.data === undefined || selected === undefined) {
    return (
      <RefreshScreen
        isRefreshing={dashboard.isRefetching}
        onRefresh={() => {
          void dashboard.refetch();
        }}
      >
        <EmptyState
          title={dashboard.isError ? 'Could not load your home tab' : 'No project mapped yet'}
          detail={
            dashboard.isError
              ? 'Check your connection and pull down to try again.'
              : 'No active project is mapped to your account yet. The Kiaan team will be in touch.'
          }
        />
      </RefreshScreen>
    );
  }

  const partnerDashboard = dashboard.data;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-3 px-5 pt-2 pb-8"
      refreshControl={
        <RefreshControl
          refreshing={dashboard.isRefetching}
          onRefresh={() => {
            void Promise.all([dashboard.refetch(), latestReport.refetch(), latestUpdate.refetch()]);
          }}
        />
      }
    >
      <DashboardGreeting
        name={session.user?.name ?? ''}
        unreadCount={partnerDashboard.unreadNotifications}
        onOpenNotifications={() => {
          router.push('/notifications');
        }}
        onOpenAccount={() => {
          router.push('/account');
        }}
      />

      <NotificationBanner
        notification={partnerDashboard.banner}
        isDismissing={false}
        onPress={openNotification}
      />

      <ProjectSwitcher
        projects={projects.map((project) => ({
          id: project.projectId,
          code: project.projectCode,
          name: project.projectName,
          badge: project.unreadNotifications,
        }))}
        selectedId={selected.projectId}
        onSelect={select}
      />

      <ContributionSummary project={selected} />
      <CycleProgressCard cycle={selected.cycle} />

      <LatestReportCard
        report={latestReport.data ?? null}
        onPress={() => {
          router.push('/mis');
        }}
      />

      <LatestUpdateCard
        update={latestUpdate.data ?? null}
        onPress={() => {
          router.push('/project');
        }}
      />

      <PendingActionsCard
        count={partnerDashboard.pendingActions}
        onPress={() => {
          router.push('/chat');
        }}
      />
    </ScrollView>
  );
}
