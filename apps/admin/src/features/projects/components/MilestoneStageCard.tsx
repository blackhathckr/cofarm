import { MILESTONE_LABELS } from '@cofarm/core/cycle';
import type { Milestone, MilestoneStatus } from '@cofarm/contracts/projects';
import { cn } from 'cn';
import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TONE: Readonly<Record<MilestoneStatus, string>> = {
  done: 'bg-sage-50 text-sage-700 border-sage-200',
  active: 'bg-clay-50 text-clay-700 border-clay-300',
  upcoming: 'bg-muted text-muted-foreground border-transparent',
};

const STATUSES: readonly MilestoneStatus[] = ['upcoming', 'active', 'done'];

const STATUS_LABELS: Readonly<Record<MilestoneStatus, string>> = {
  upcoming: 'Upcoming',
  active: 'In progress',
  done: 'Done',
};

export type MilestoneEdit = {
  status: MilestoneStatus;
  actualFrom: string | null;
  actualTo: string | null;
};

type MilestoneStageCardProps = {
  milestone: Milestone;
  disabled: boolean;
  onChange: (edit: MilestoneEdit) => void;
};

export function MilestoneStageCard({ milestone, disabled, onChange }: MilestoneStageCardProps) {
  const label = MILESTONE_LABELS[milestone.stage];
  const [from, setFrom] = useState(milestone.actualFrom ?? '');
  const [to, setTo] = useState(milestone.actualTo ?? '');
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    setFrom(milestone.actualFrom ?? '');
    setTo(milestone.actualTo ?? '');
  }, [milestone.actualFrom, milestone.actualTo]);

  // Every change carries all three fields: the endpoint replaces the dates it
  // is given, so sending a status alone would clear them.
  const change = (edit: Partial<MilestoneEdit>) => {
    onChange({
      status: milestone.status,
      actualFrom: milestone.actualFrom,
      actualTo: milestone.actualTo,
      ...edit,
    });
  };

  const commit = (next: { from: string; to: string }) => {
    if (next.from !== '' && next.to !== '' && next.to < next.from) {
      setProblem('The finish date cannot precede the start.');
      return;
    }
    setProblem(null);
    change({
      actualFrom: next.from === '' ? null : next.from,
      actualTo: next.to === '' ? null : next.to,
    });
  };

  return (
    <li className={cn('space-y-2 rounded-md border px-3 py-2', TONE[milestone.status])}>
      <span className="block text-xs font-semibold">{label}</span>

      <Select
        value={milestone.status}
        disabled={disabled}
        onValueChange={(value) => {
          change({ status: value as MilestoneStatus });
        }}
      >
        <SelectTrigger size="sm" aria-label={`${label} status`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="space-y-1">
        <Label className="text-xs opacity-70">Started</Label>
        <Input
          type="date"
          className="h-8 text-xs"
          aria-label={`${label} start date`}
          value={from}
          disabled={disabled}
          onChange={(event) => {
            setFrom(event.target.value);
          }}
          onBlur={() => {
            commit({ from, to });
          }}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs opacity-70">Finished</Label>
        <Input
          type="date"
          className="h-8 text-xs"
          aria-label={`${label} finish date`}
          value={to}
          min={from === '' ? undefined : from}
          disabled={disabled}
          onChange={(event) => {
            setTo(event.target.value);
          }}
          onBlur={() => {
            commit({ from, to });
          }}
        />
      </div>

      {problem === null ? null : (
        <p role="alert" className="text-xs font-semibold text-destructive">
          {problem}
        </p>
      )}

      {milestone.plannedFrom === null ? null : (
        <span className="tabular block text-xs opacity-60">
          {`Planned ${milestone.plannedFrom}`}
        </span>
      )}
    </li>
  );
}
