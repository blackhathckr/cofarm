import { useQueryClient } from '@tanstack/react-query';
import { Spinner } from 'heroui-native';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { MilestoneTimeline } from '@/components/ui/MilestoneTimeline';
import { ProjectSwitcher } from '@/components/ui/ProjectSwitcher';
import { RefreshScreen } from '@/components/ui/RefreshScreen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useSession } from '@/features/auth/hooks/use-session.ts';
import { useSelectedProject } from '@/lib/selected-project.ts';
import { ActivityLog } from '../components/ActivityLog';
import { CycleProgress } from '../components/CycleProgress';
import { PhotoGallery } from '../components/PhotoGallery';
import { ProjectCarousel } from '../components/ProjectCarousel';
import { ProjectHeader } from '../components/ProjectHeader';
import { UpdateFeed } from '../components/UpdateFeed';
import { useActivityLog } from '../hooks/use-activity-log.ts';
import { useMarkUpdateRead } from '../hooks/use-mark-update-read.ts';
import { useProject } from '../hooks/use-project.ts';
import { useUpdateFeed } from '../hooks/use-update-feed.ts';

const GALLERY_PHOTO_LIMIT = 9;

type ProjectStatusScreenProps = {
  highlightUpdateId?: string;
};

export function ProjectStatusScreen({ highlightUpdateId }: ProjectStatusScreenProps) {
  const session = useSession();
  const queryClient = useQueryClient();
  const memberships = session.user?.projects ?? [];
  const { projectId, select } = useSelectedProject();
  const [openUpdateId, setOpenUpdateId] = useState<string | null>(null);

  const project = useProject(projectId);
  const feed = useUpdateFeed(projectId);
  const activity = useActivityLog(projectId);
  const markUpdateRead = useMarkUpdateRead();

  const updates = feed.items;
  const entries = activity.items;
  const openUpdate = updates.find((update) => update.id === openUpdateId) ?? null;
  const documentIds = (
    openUpdate === null
      ? updates.flatMap((update) => update.photoDocumentIds)
      : openUpdate.photoDocumentIds
  ).slice(0, GALLERY_PHOTO_LIMIT);

  if (projectId === null || (project.isError && project.data === undefined)) {
    return (
      <RefreshScreen
        isRefreshing={project.isRefetching}
        onRefresh={() => {
          void project.refetch();
        }}
      >
        <EmptyState
          title={projectId === null ? 'No project mapped yet' : 'Could not load your project'}
          detail={
            projectId === null
              ? 'The Kiaan team will map your project to this number shortly.'
              : 'Check your connection and pull down to try again.'
          }
        />
      </RefreshScreen>
    );
  }

  if (project.data === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  const farm = project.data;
  const cycle = farm.currentCycle;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-5 px-5 pt-3 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={project.isRefetching || feed.isRefetching || activity.isRefetching}
          onRefresh={() => {
            void Promise.all([project.refetch(), feed.refetch(), activity.refetch()]);
            void queryClient.invalidateQueries({ queryKey: ['documents'] });
          }}
        />
      }
    >
      <ProjectSwitcher
        projects={memberships.map((membership) => ({
          id: membership.projectId,
          code: membership.code,
          name: membership.name,
        }))}
        selectedId={projectId}
        onSelect={(nextProjectId) => {
          select(nextProjectId);
          setOpenUpdateId(null);
        }}
      />

      <ProjectHeader project={farm} />

      <ProjectCarousel updates={updates} cycleNo={cycle?.cycleNo ?? null} />

      {cycle === null ? (
        <EmptyState
          title="No cycle has started"
          detail="Your plot is being prepared. Stage-by-stage progress appears here once planting begins."
        />
      ) : (
        <>
          <CycleProgress cycle={cycle} />
          <View className="gap-3">
            <SectionHeader title="Cycle stages" />
            <View className="rounded-3xl bg-surface p-4 pb-0">
              <MilestoneTimeline milestones={cycle.milestones} />
            </View>
          </View>
        </>
      )}

      <UpdateFeed
        updates={updates}
        openUpdateId={openUpdateId}
        highlightUpdateId={highlightUpdateId ?? null}
        onOpenPhotos={(updateId) => {
          setOpenUpdateId(updateId === openUpdateId ? null : updateId);
          markUpdateRead.mutate({ projectId, updateId });
        }}
        hasMore={feed.hasNextPage}
        isLoadingMore={feed.isFetchingNextPage}
        onLoadMore={() => {
          void feed.fetchNextPage();
        }}
      />

      <PhotoGallery documentIds={documentIds} isSingleUpdate={openUpdate !== null} />

      <ActivityLog
        entries={entries}
        hasMore={activity.hasNextPage}
        isLoadingMore={activity.isFetchingNextPage}
        onLoadMore={() => {
          void activity.fetchNextPage();
        }}
      />
    </ScrollView>
  );
}
