import { EmptyState } from '@/components/EmptyState';
import { LoadMore } from '@/components/LoadMore';
import { Separator } from '@/components/ui/separator';
import { useActivity } from '../hooks/use-activity.ts';
import { ActivityAddForm } from './ActivityAddForm';

type ActivityLogSectionProps = {
  projectId: string;
};

export function ActivityLogSection({ projectId }: ActivityLogSectionProps) {
  const entries = useActivity(projectId);
  const rows = entries.items;

  return (
    <section className="space-y-4 rounded-lg border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Activity log</h2>
        <p className="text-sm text-muted-foreground">
          Day-to-day field work. Partners see these on their project screen, without a notification.
        </p>
      </div>

      <ActivityAddForm projectId={projectId} />

      <Separator />

      {rows.length === 0 ? (
        <EmptyState
          title="No entries logged yet"
          detail="Log field work here. It appears on the partner's project screen."
        />
      ) : (
        <ul className="divide-y">
          {rows.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium">{entry.title}</p>
                {entry.detail === null ? null : (
                  <p className="text-sm text-muted-foreground">{entry.detail}</p>
                )}
              </div>
              <span className="tabular shrink-0 text-xs text-muted-foreground">
                {entry.activityDate}
              </span>
            </li>
          ))}
        </ul>
      )}

      <LoadMore paging={entries} label="Load older entries" />
    </section>
  );
}
