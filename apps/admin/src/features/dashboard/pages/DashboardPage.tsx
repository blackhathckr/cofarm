import { EmptyState } from '@/components/EmptyState';
import { StatTile } from '@/components/StatTile';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskCard } from '../components/TaskCard';
import { useAdminDashboard } from '../hooks/use-admin-dashboard.ts';
import { byUrgency, TASK_KIND_LABELS } from '../task-kinds.ts';

export function DashboardPage() {
  const dashboard = useAdminDashboard();

  if (dashboard.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (dashboard.data === undefined) {
    return <p className="text-sm text-muted-foreground">The dashboard could not be loaded.</p>;
  }

  const { counts, tasks, unavailableTaskKinds } = dashboard.data;
  const ordered = [...tasks].sort((left, right) => byUrgency(left.urgency, right.urgency));
  const unavailable = unavailableTaskKinds.map((kind) => TASK_KIND_LABELS[kind]).join(', ');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">What the platform needs from you today.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Active partners" value={counts.activePartners} />
        <StatTile label="Active projects" value={counts.activeProjects} />
        <StatTile label="Total acres" value={counts.totalAcreageAcres} tone="sage" />
        <StatTile
          label="Pending actions"
          value={counts.pendingActions}
          hint="across every project"
          tone="clay"
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Needs attention</h2>

        {ordered.length === 0 ? (
          <EmptyState
            title="Nothing needs attention right now"
            detail="Overdue reports, unsigned agreements and unanswered queries land here."
          />
        ) : (
          <ul className="space-y-3">
            {ordered.map((task) => (
              <TaskCard key={`${task.kind}:${task.projectId}`} task={task} />
            ))}
          </ul>
        )}

        {unavailable === '' ? null : (
          <p className="text-xs text-muted-foreground">
            {`This list leaves out ${unavailable} — those checks are not wired in yet.`}
          </p>
        )}
      </div>
    </div>
  );
}
