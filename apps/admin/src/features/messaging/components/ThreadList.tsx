import type { AdminThreadSummary } from '@cofarm/contracts/messaging';
import { cn } from 'cn';

import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { formatThreadActivity } from '../message-times.ts';

type ThreadListProps = {
  threads: readonly AdminThreadSummary[];
  selectedThreadId: string | null;
  onSelect: (threadId: string) => void;
};

export function ThreadList({ threads, selectedThreadId, onSelect }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <EmptyState
        title="No queries match this filter"
        detail="Partners raise a query from the app; it lands here as a thread."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {threads.map((thread) => (
        <li key={thread.id}>
          <button
            type="button"
            onClick={() => {
              onSelect(thread.id);
            }}
            className={cn(
              'w-full rounded-lg border p-3 text-left transition-colors',
              thread.id === selectedThreadId
                ? 'border-clay-300 bg-clay-50'
                : 'bg-card hover:bg-sand-50',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-semibold">{thread.partnerName}</p>
              {thread.unreadFromPartnerCount > 0 ? (
                <Badge>{thread.unreadFromPartnerCount}</Badge>
              ) : null}
            </div>
            <p className="text-xs font-semibold text-clay-700">{thread.projectCode}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {thread.lastMessagePreview ?? 'No messages yet'}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <Badge variant={thread.status === 'open' ? 'secondary' : 'outline'}>
                {thread.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatThreadActivity(thread.lastMessageAt)}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
