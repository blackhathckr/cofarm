import { threadStatusSchema, type ThreadStatus } from '@cofarm/contracts/messaging';
import { useLocation } from '@tanstack/react-router';
import { useState } from 'react';

import { LoadMore } from '@/components/LoadMore';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { readInboxLink } from '@/lib/inbox-link.ts';
import { useProjectOptions } from '@/lib/project-options.ts';
import { useThreads } from '@/lib/thread-list.ts';
import { ThreadList } from '../components/ThreadList';
import { ThreadView } from '../components/ThreadView';

const ALL_PROJECTS = 'all-projects';
const ALL_STATUSES = 'all-statuses';

export function InboxPage() {
  const linked = readInboxLink(useLocation().searchStr);
  const [projectId, setProjectId] = useState<string | null>(linked.projectId);
  const [status, setStatus] = useState<ThreadStatus | null>(null);
  const [pickedThreadId, setPickedThreadId] = useState<string | null>(null);

  const projects = useProjectOptions();
  const threads = useThreads({
    ...(projectId === null ? {} : { projectId }),
    ...(status === null ? {} : { status }),
  });

  const items = threads.items;
  const wantedThreadId = pickedThreadId ?? linked.threadId;
  const activeThreadId = items.some((thread) => thread.id === wantedThreadId)
    ? wantedThreadId
    : (items[0]?.id ?? null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Query inbox</h1>
          <p className="text-sm text-muted-foreground">
            One thread per partner per project. Replying marks their messages read.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Project</Label>
            <Select
              value={projectId ?? ALL_PROJECTS}
              onValueChange={(next) => {
                setProjectId(next === ALL_PROJECTS ? null : next);
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
                {(projects.data?.items ?? []).map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {`${project.code} · ${project.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={status ?? ALL_STATUSES}
              onValueChange={(next) => {
                const chosen = threadStatusSchema.safeParse(next);
                setStatus(chosen.success ? chosen.data : null);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
                {threadStatusSchema.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {threads.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-80">
            <ThreadList
              threads={items}
              selectedThreadId={activeThreadId}
              onSelect={setPickedThreadId}
            />
            <LoadMore paging={threads} label="Load more queries" />
          </aside>
          <section className="min-w-0 flex-1">
            {activeThreadId === null ? (
              <p className="rounded-lg border border-dashed bg-card p-6 text-sm text-muted-foreground">
                Pick a thread to read the conversation.
              </p>
            ) : (
              <ThreadView threadId={activeThreadId} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
