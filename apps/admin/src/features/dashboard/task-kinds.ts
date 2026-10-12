import type { DashboardTask, DashboardTaskKind, TaskUrgency } from '@cofarm/contracts/dashboard';

export const TASK_KIND_LABELS: Record<DashboardTaskKind, string> = {
  mis_missing: 'monthly MIS uploads',
  mis_unpublished: 'MIS publishing',
  mis_unread: 'MIS read receipts',
  unsigned_agreements: 'agreement signing',
  harvest_draft: 'harvest settlement',
};

export type TaskCta = { label: string; to: string };

const CTA_LABELS: Record<DashboardTaskKind, string> = {
  mis_missing: 'Upload MIS',
  mis_unpublished: 'Publish MIS',
  mis_unread: 'Nudge partners',
  unsigned_agreements: 'Open approvals',
  harvest_draft: 'Open harvest',
};

/** Where the admin goes to clear the task, scoped to the project that raised it. */
export function taskCta(task: Pick<DashboardTask, 'kind' | 'projectId'>): TaskCta {
  const label = CTA_LABELS[task.kind];

  switch (task.kind) {
    case 'mis_missing':
    case 'mis_unpublished':
    case 'mis_unread':
      return { label, to: `/projects/${task.projectId}/mis` };
    case 'harvest_draft':
      return { label, to: `/projects/${task.projectId}/harvest` };
    case 'unsigned_agreements':
      return { label, to: '/approvals' };
  }
}

export const URGENCY_CARD: Record<TaskUrgency, string> = {
  due: 'border-clay-300 bg-clay-50',
  upcoming: 'border-sand-300 bg-sand-100',
  reminder: 'border-sage-200 bg-sage-50',
};

export const URGENCY_DUE_TEXT: Record<TaskUrgency, string> = {
  due: 'text-clay-700',
  upcoming: 'text-sand-700',
  reminder: 'text-sage-700',
};

export const URGENCY_BADGE: Record<TaskUrgency, 'destructive' | 'secondary' | 'outline'> = {
  due: 'destructive',
  upcoming: 'secondary',
  reminder: 'outline',
};

const URGENCY_RANK: Record<TaskUrgency, number> = { due: 0, upcoming: 1, reminder: 2 };

export function byUrgency(left: TaskUrgency, right: TaskUrgency): number {
  return URGENCY_RANK[left] - URGENCY_RANK[right];
}
