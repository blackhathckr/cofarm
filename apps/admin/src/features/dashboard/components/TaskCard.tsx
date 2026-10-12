import type { DashboardTask } from '@cofarm/contracts/dashboard';
import { Link, type AnyRouter } from '@tanstack/react-router';
import { cn } from 'cn';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { taskCta, URGENCY_BADGE, URGENCY_CARD, URGENCY_DUE_TEXT } from '../task-kinds.ts';

type TaskCardProps = {
  task: DashboardTask;
};

export function TaskCard({ task }: TaskCardProps) {
  const cta = taskCta(task);

  return (
    <li
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4',
        URGENCY_CARD[task.urgency],
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant={URGENCY_BADGE[task.urgency]}>{task.projectCode}</Badge>
          <p className="truncate font-semibold">{task.title}</p>
        </div>
        <p className="text-sm text-muted-foreground">{task.detail}</p>
        <p className={cn('text-xs font-semibold', URGENCY_DUE_TEXT[task.urgency])}>
          {task.dueLabel}
        </p>
      </div>

      <Button variant="outline" size="sm" asChild>
        {/* Routes are registered by the app shell, which this feature cannot
            see, so the link is typed against any router. */}
        <Link<AnyRouter, string, string> to={cta.to}>{cta.label}</Link>
      </Button>
    </li>
  );
}
