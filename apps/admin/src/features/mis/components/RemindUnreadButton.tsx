import { Button } from '@/components/ui/button';
import { ErrorNote } from '@/components/ErrorNote';
import { remindOutcome, useRemindUnread } from '@/lib/remind-unread.ts';

type RemindUnreadButtonProps = {
  projectId: string;
  reportId: string;
  unreadCount: number;
};

export function RemindUnreadButton({ projectId, reportId, unreadCount }: RemindUnreadButtonProps) {
  const remind = useRemindUnread();

  if (unreadCount === 0) return null;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={remind.isPending}
        onClick={() => {
          remind.mutate({ projectId, entityType: 'mis_report', entityId: reportId });
        }}
      >
        {remind.isPending
          ? 'Sending reminders…'
          : `Remind ${unreadCount.toString()} who have not opened it`}
      </Button>

      <ErrorNote error={remind.error} />

      {remind.data === undefined ? null : (
        <p className="text-sm text-muted-foreground">{remindOutcome(remind.data)}</p>
      )}
    </div>
  );
}
