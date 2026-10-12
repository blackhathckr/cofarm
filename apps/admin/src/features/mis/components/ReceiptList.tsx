import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMisReceipts } from '../hooks/use-mis.ts';
import { RemindUnreadButton } from './RemindUnreadButton';

type ReceiptListProps = {
  projectId: string;
  reportId: string;
};

function readAtLabel(readAt: string | null): string {
  return readAt === null ? '—' : new Date(readAt).toLocaleString('en-IN');
}

export function ReceiptList({ projectId, reportId }: ReceiptListProps) {
  const receipts = useMisReceipts(projectId, reportId);

  if (receipts.data === undefined) {
    return <Skeleton className="h-24 w-full" />;
  }

  const { readCount, totalCount, recipients } = receipts.data;

  return (
    <div className="space-y-3 rounded-lg border bg-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Read receipts</h2>
        <p className="tabular text-sm text-muted-foreground">
          {`${readCount.toString()} of ${totalCount.toString()} partners have opened it`}
        </p>
      </div>

      {recipients.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nobody has been addressed yet. Publish the report to send it to partners.
        </p>
      ) : (
        <ul className="divide-y">
          {recipients.map((recipient) => (
            <li
              key={recipient.userId}
              className="flex flex-wrap items-center justify-between gap-3 py-2"
            >
              <span className="text-sm font-medium">{recipient.name}</span>
              <span className="flex items-center gap-3">
                <span className="tabular text-xs text-muted-foreground">
                  {readAtLabel(recipient.readAt)}
                </span>
                <Badge variant={recipient.isRead ? 'default' : 'outline'}>
                  {recipient.isRead ? 'Read' : 'Unread'}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      )}

      <RemindUnreadButton
        projectId={projectId}
        reportId={reportId}
        unreadCount={totalCount - readCount}
      />
    </div>
  );
}
