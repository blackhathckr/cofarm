import { Trash2 } from 'lucide-react';
import { cycleStatusSchema, type CycleStatus } from '@cofarm/contracts/projects';
import { useState } from 'react';

import { ErrorNote } from '@/components/ErrorNote';
import { MoneyText } from '@/components/MoneyText';
import { StatTile } from '@/components/StatTile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectCycles } from '@/lib/project-cycles.ts';

import { CycleMilestones } from '../components/CycleMilestones';
import { OpenCycleDialog } from '../components/OpenCycleDialog';
import { useProject } from '../hooks/use-projects.ts';
import { useDeleteCycle, useSetCycleStatus } from '../hooks/use-create-project.ts';

const CYCLE_STATUS_LABELS: Readonly<Record<CycleStatus, string>> = {
  planned: 'Planned',
  active: 'Active',
  harvested: 'Harvested',
  closed: 'Closed',
};

type ProjectDetailPageProps = {
  projectId: string;
};

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const project = useProject(projectId);
  const cycles = useProjectCycles(projectId);
  const setStatus = useSetCycleStatus(projectId);
  const remove = useDeleteCycle(projectId);
  const [shownCycleId, setShownCycleId] = useState<string | null>(null);

  if (project.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (project.data === undefined) {
    return <p className="text-sm text-muted-foreground">That project could not be loaded.</p>;
  }

  const farm = project.data;
  // Newest first, and the current one leads when nothing is picked.
  const history = [...(cycles.data ?? [])].sort((left, right) => right.cycleNo - left.cycleNo);
  const cycle = history.find((row) => row.id === shownCycleId) ?? history[0] ?? farm.currentCycle;
  const latestCycleNo = history[0]?.cycleNo ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{farm.code}</h1>
            <Badge variant={farm.status === 'active' ? 'default' : 'secondary'}>
              {farm.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {`${farm.name} · ${farm.location} · ${farm.acreageAcres} acres`}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Variety" value={farm.variety} />
        <StatTile label="Partners" value={farm.partnerCount} />
        <StatTile
          label="Allocated"
          value={<MoneyText paise={farm.allocatedPaise} />}
          hint={`of ${farm.capacityPaise === '0' ? 'no stated capacity' : 'capacity'}`}
          tone="sage"
        />
        <StatTile
          label="Kiaan share"
          value={`${farm.kiaanShareBps / 100}%`}
          hint="of net proceeds"
          tone="clay"
        />
      </div>

      {cycle === null ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed bg-card p-6">
          <p className="text-sm text-muted-foreground">
            No cycle has been opened on this project yet. Costs, updates and the harvest all hang
            off a cycle.
          </p>
          <OpenCycleDialog projectId={projectId} nextCycleNo={1} />
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">{`Cycle ${cycle.cycleNo}`}</h2>
              <p className="text-sm text-muted-foreground">
                {`Started ${cycle.startDate}`}
                {cycle.expectedHarvestFrom === null
                  ? ''
                  : ` · harvest expected ${cycle.expectedHarvestFrom}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {history.length < 2
                ? null
                : history.map((row) => (
                    <Button
                      key={row.id}
                      type="button"
                      size="sm"
                      variant={row.id === cycle.id ? 'default' : 'outline'}
                      onClick={() => {
                        setShownCycleId(row.id);
                      }}
                    >
                      {`Cycle ${row.cycleNo}`}
                    </Button>
                  ))}
              <OpenCycleDialog projectId={projectId} nextCycleNo={latestCycleNo + 1} />
            </div>
          </div>

          <CycleMilestones projectId={projectId} cycle={cycle} />

          <Separator />

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cycle status</Label>
              <Select
                value={cycle.status}
                disabled={setStatus.isPending}
                onValueChange={(status) => {
                  setStatus.mutate({ cycleId: cycle.id, status: status as CycleStatus });
                }}
              >
                <SelectTrigger size="sm" className="w-44" aria-label="Cycle status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cycleStatusSchema.options.map((status) => (
                    <SelectItem key={status} value={status}>
                      {CYCLE_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() => {
                remove.mutate(cycle.id, {
                  onSuccess: () => {
                    setShownCycleId(null);
                  },
                });
              }}
            >
              <Trash2 />
              {remove.isPending ? 'Deleting…' : 'Delete cycle'}
            </Button>

            <p className="text-xs text-muted-foreground">
              {cycle.endDate === null
                ? 'A cycle with a harvest, recorded costs or issued statements cannot be deleted.'
                : `Ended ${cycle.endDate}. A cycle with a harvest, recorded costs or issued statements cannot be deleted.`}
            </p>
          </div>

          <ErrorNote error={setStatus.error ?? remove.error} />
        </div>
      )}
    </div>
  );
}
