import { ErrorNote } from '@/components/ErrorNote';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useHarvestPreview } from '../hooks/use-harvest-preview.ts';
import { PartnerShareTable } from './PartnerShareTable';
import { PnlTotals } from './PnlTotals';
import { PublishHarvestDialog } from './PublishHarvestDialog';
import { RecordPayoutsDialog } from './RecordPayoutsDialog';

type PnlPreviewProps = {
  projectId: string;
  harvestId: string;
};

export function PnlPreview({ projectId, harvestId }: PnlPreviewProps) {
  const preview = useHarvestPreview(projectId, harvestId);

  if (preview.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (preview.data === undefined) {
    return <ErrorNote error={preview.error} />;
  }

  const figures = preview.data;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{`Cycle ${figures.cycleNo} profit and loss`}</h2>
          <p className="text-sm text-muted-foreground">
            Net proceeds split by the agreed basis points, the partner pool then divided pro-rata by
            contribution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={figures.status === 'published' ? 'default' : 'secondary'}>
            {figures.status}
          </Badge>
          {figures.status === 'draft' ? (
            <PublishHarvestDialog preview={figures} />
          ) : (
            <RecordPayoutsDialog
              projectId={projectId}
              harvestId={harvestId}
              partnerPoolPaise={figures.partnerPoolPaise}
              partnerCount={figures.partners.length}
            />
          )}
        </div>
      </div>

      <PnlTotals preview={figures} />
      <PartnerShareTable preview={figures} />
    </section>
  );
}
