import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Loading } from '@/components/ui/Loading';
import { RefreshScreen } from '@/components/ui/RefreshScreen';
import { ProjectSwitcher } from '@/components/ui/ProjectSwitcher';
import { useSession } from '@/features/auth/hooks/use-session.ts';
import { useSelectedProject } from '@/lib/selected-project.ts';
import { ApiError } from '@/lib/api-client.ts';
import { useDocumentDownload } from '@/lib/document-download.ts';
import { MisArchiveList } from '../components/MisArchiveList';
import { MisLatestCard } from '../components/MisLatestCard';
import { MisReportDialog } from '../components/MisReportDialog';
import { useMisReports } from '../hooks/use-mis-reports.ts';
import { useOpenMisReport } from '../hooks/use-open-mis-report.ts';

type MisScreenProps = {
  /** Set when a partner arrives from a notification about one report. */
  openReportId?: string;
};

export function MisScreen({ openReportId }: MisScreenProps) {
  const session = useSession();
  const { projectId, select } = useSelectedProject();
  const memberships = session.user?.projects ?? [];
  const reports = useMisReports(projectId);
  const openReport = useOpenMisReport(projectId);
  const { mutate: requestReport } = openReport;
  const download = useDocumentDownload();
  const [shownReportId, setShownReportId] = useState<string | null>(null);

  const published = reports.items;
  const [latest, ...archive] = published;
  const detail = openReport.data?.id === shownReportId ? openReport.data : null;
  const openingReportId = openReport.isPending ? shownReportId : null;
  const downloadError = download.error instanceof ApiError ? download.error.message : null;

  const open = (reportId: string) => {
    download.reset();
    setShownReportId(reportId);
    requestReport(reportId);
  };

  useEffect(() => {
    if (openReportId === undefined || projectId === null) return;
    setShownReportId(openReportId);
    requestReport(openReportId);
  }, [openReportId, projectId, requestReport]);

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

  if (reports.isPending || latest === undefined) {
    return (
      <View className="flex-1 bg-background">
        <View className="px-5 pt-3">{switcher}</View>
        {reports.isPending ? (
          <Loading />
        ) : (
          <RefreshScreen
            isRefreshing={reports.isRefetching}
            onRefresh={() => {
              void reports.refetch();
            }}
          >
            <EmptyState
              title="No report published yet"
              detail="Your first monthly report will appear here as soon as the Kiaan team publishes it."
            />
          </RefreshScreen>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-5 px-5 pt-3 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={reports.isRefetching}
          onRefresh={() => {
            void reports.refetch();
          }}
        />
      }
    >
      {switcher}

      <Text className="text-sm text-muted">
        Your monthly farm report, published by the Kiaan team.
      </Text>

      <MisLatestCard
        report={latest}
        isOpening={openingReportId === latest.id}
        onOpen={() => {
          open(latest.id);
        }}
      />

      {archive.length === 0 ? null : (
        <MisArchiveList
          reports={archive}
          openingReportId={openingReportId}
          onOpen={open}
          hasMore={reports.hasNextPage}
          isLoadingMore={reports.isFetchingNextPage}
          onLoadMore={() => {
            void reports.fetchNextPage();
          }}
        />
      )}

      <MisReportDialog
        report={detail}
        isOpen={shownReportId !== null}
        isPending={openReport.isPending}
        isDownloading={download.isPending}
        downloadError={downloadError}
        onDownload={(documentId) => {
          download.mutate(documentId);
        }}
        onClose={() => {
          setShownReportId(null);
          openReport.reset();
          download.reset();
        }}
      />
    </ScrollView>
  );
}
