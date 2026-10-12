import { LoadMore } from '@/components/LoadMore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentDownload } from '@/lib/document-download.ts';
import { useSetThreadStatus } from '../hooks/use-thread-actions.ts';
import { useThread } from '../hooks/use-thread.ts';
import { MessageBubble } from './MessageBubble';
import { ReplyComposer } from './ReplyComposer';

type ThreadViewProps = {
  threadId: string;
};

export function ThreadView({ threadId }: ThreadViewProps) {
  const thread = useThread(threadId);
  const setStatus = useSetThreadStatus(threadId);
  const download = useDocumentDownload();

  if (thread.isPending) {
    return (
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const head = thread.firstPage;
  if (head === undefined) {
    return (
      <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        That conversation could not be loaded.
      </p>
    );
  }

  const messages = thread.items;
  const isOpen = head.status === 'open';

  return (
    <div className="flex flex-col rounded-lg border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{head.partnerName}</h2>
            <Badge variant={isOpen ? 'secondary' : 'outline'}>{head.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {`${head.projectCode} · ${head.projectName}`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={setStatus.isPending}
          onClick={() => {
            setStatus.mutate(isOpen ? 'resolved' : 'open');
          }}
        >
          {isOpen ? 'Resolve' : 'Reopen'}
        </Button>
      </div>

      <div className="max-h-96 space-y-3 overflow-y-auto p-4">
        {thread.hasNextPage ? (
          <LoadMore paging={thread} label="Load older messages" />
        ) : (
          <p className="text-center text-xs text-muted-foreground">Start of the conversation</p>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onViewDocument={(documentId) => {
              download.mutate(documentId);
            }}
          />
        ))}
      </div>

      <ReplyComposer threadId={threadId} projectId={head.projectId} />
    </div>
  );
}
