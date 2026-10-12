import type { UpdateStatus } from '@cofarm/contracts/updates';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { LoadMore } from '@/components/LoadMore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityLogSection } from '../components/ActivityLogSection';
import { EditUpdateDialog } from '../components/EditUpdateDialog';
import { UpdateCard } from '../components/UpdateCard';
import { useUpdates, useUpdateProject } from '../hooks/use-updates.ts';

type UpdateHistoryPageProps = {
  projectId: string;
};

const FILTERS: { value: string; label: string; status: UpdateStatus | null }[] = [
  { value: 'all', label: 'All', status: null },
  { value: 'draft', label: 'Drafts', status: 'draft' },
  { value: 'published', label: 'Published', status: 'published' },
];

function postUpdatePath(projectId: string): string {
  return `/projects/${projectId}/updates/new`;
}

export function UpdateHistoryPage({ projectId }: UpdateHistoryPageProps) {
  const [filter, setFilter] = useState('all');
  const [openUpdateId, setOpenUpdateId] = useState<string | null>(null);
  const project = useUpdateProject(projectId);
  const status = FILTERS.find((entry) => entry.value === filter)?.status ?? null;
  const updates = useUpdates(projectId, status);

  const rows = updates.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Update history</h1>
          <p className="text-sm text-muted-foreground">
            {project.data === undefined
              ? 'Newest activity first.'
              : `${project.data.code} · ${project.data.name} · newest activity first.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              {FILTERS.map((entry) => (
                <TabsTrigger key={entry.value} value={entry.value}>
                  {entry.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Button asChild>
            <Link to={postUpdatePath(projectId)}>
              <Plus />
              Post update
            </Link>
          </Button>
        </div>
      </div>

      {updates.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((summary) => (
            <UpdateCard
              key={summary.id}
              summary={summary}
              onOpen={() => {
                setOpenUpdateId(summary.id);
              }}
            />
          ))}
          {rows.length === 0 ? (
            <EmptyState
              title="No updates match this filter"
              detail="Post an update to tell partners what happened in the field."
            />
          ) : null}
          <LoadMore paging={updates} label="Load older updates" />
        </div>
      )}

      <ActivityLogSection projectId={projectId} />

      <EditUpdateDialog
        projectId={projectId}
        updateId={openUpdateId}
        onClose={() => {
          setOpenUpdateId(null);
        }}
      />
    </div>
  );
}
