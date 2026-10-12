import { Link } from '@tanstack/react-router';
import { MessagesSquare } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/date-format.ts';
import { inboxThreadLink } from '@/lib/inbox-link.ts';
import { useThreads } from '@/lib/thread-list.ts';

type PartnerProjectThreadProps = {
  partnerId: string;
  projectId: string;
  projectCode: string;
  projectName: string;
};

export function PartnerProjectThread({
  partnerId,
  projectId,
  projectCode,
  projectName,
}: PartnerProjectThreadProps) {
  const threads = useThreads({ projectId, userId: partnerId });

  if (threads.isPending) return <Skeleton className="h-24 w-full" />;

  const thread = threads.items[0];

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-clay-700">{projectCode}</h3>
            {thread === undefined ? null : (
              <Badge variant={thread.status === 'open' ? 'secondary' : 'outline'}>
                {thread.status}
              </Badge>
            )}
            {thread !== undefined && thread.unreadFromPartnerCount > 0 ? (
              <Badge>{`${String(thread.unreadFromPartnerCount)} unread`}</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{projectName}</p>
        </div>

        {thread === undefined ? null : (
          <Link
            {...inboxThreadLink(thread.id, projectId)}
            className="flex items-center gap-1 text-sm font-medium text-clay-700 hover:underline"
          >
            <MessagesSquare className="size-4" />
            Open in inbox
          </Link>
        )}
      </div>

      {thread === undefined ? (
        <p className="mt-2 text-sm text-muted-foreground">
          This partner has not opened a query on this project.
        </p>
      ) : (
        <div className="mt-2 space-y-1">
          <p className="line-clamp-3 text-sm">{thread.lastMessagePreview ?? 'No messages yet'}</p>
          <p className="text-xs text-muted-foreground">
            {thread.lastMessageAt === null
              ? 'No activity'
              : `Last message ${formatDateTime(thread.lastMessageAt)}`}
          </p>
        </div>
      )}
    </div>
  );
}
