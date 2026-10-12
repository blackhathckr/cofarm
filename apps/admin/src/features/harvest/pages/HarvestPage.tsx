import { Link } from '@tanstack/react-router';
import { EmptyState } from '@/components/EmptyState';
import { ErrorNote } from '@/components/ErrorNote';
import { MoneyText } from '@/components/MoneyText';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProjectCycles } from '@/lib/project-cycles.ts';
import { useHarvests } from '../hooks/use-harvests.ts';

type HarvestPageProps = {
  projectId: string;
};

function newHarvestPath(projectId: string): string {
  return `/projects/${projectId}/harvest/new`;
}

function harvestPath(projectId: string, harvestId: string): string {
  return `/projects/${projectId}/harvest/${harvestId}`;
}

export function HarvestPage({ projectId }: HarvestPageProps) {
  const harvests = useHarvests(projectId);
  const cycles = useProjectCycles(projectId);

  const recorded = harvests.data ?? [];
  const withHarvest = new Set(recorded.map((harvest) => harvest.cycleId));
  const openCycles = (cycles.data ?? []).filter((cycle) => !withHarvest.has(cycle.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Harvests</h1>
          <p className="text-sm text-muted-foreground">
            One harvest per cycle. A draft can be revised; a published one cannot.
          </p>
        </div>
        <Link
          to={newHarvestPath(projectId)}
          className="font-semibold text-clay-700 hover:underline"
        >
          Enter a harvest
        </Link>
      </div>

      <ErrorNote error={harvests.error} />

      {harvests.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cycle</TableHead>
                <TableHead>Harvested on</TableHead>
                <TableHead className="text-right">Yield</TableHead>
                <TableHead className="text-right">Price per kg</TableHead>
                <TableHead className="text-right">Gross revenue</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {recorded.length === 0 ? (
                <EmptyState
                  colSpan={8}
                  title="No harvest has been entered on this project yet"
                  detail="Enter a harvest for a cycle to preview its P&L and partner shares."
                />
              ) : null}
              {recorded.map((harvest) => (
                <TableRow key={harvest.id}>
                  <TableCell className="font-semibold">{`Cycle ${harvest.cycleNo}`}</TableCell>
                  <TableCell className="tabular">{harvest.harvestedOn}</TableCell>
                  <TableCell className="tabular text-right">{`${harvest.yieldKg} kg`}</TableCell>
                  <TableCell className="text-right">
                    <MoneyText paise={harvest.pricePerKgPaise} showPaise />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyText paise={harvest.grossRevenuePaise} showPaise />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{harvest.buyer}</TableCell>
                  <TableCell>
                    <Badge variant={harvest.status === 'published' ? 'default' : 'secondary'}>
                      {harvest.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      to={harvestPath(projectId, harvest.id)}
                      className="font-semibold text-clay-700 hover:underline"
                    >
                      {harvest.status === 'draft' ? 'Edit and preview' : 'Open'}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {openCycles.length === 0 ? null : (
        <p className="text-sm text-muted-foreground">
          {`Awaiting a harvest: ${openCycles.map((cycle) => `cycle ${cycle.cycleNo}`).join(', ')}.`}
        </p>
      )}
    </div>
  );
}
