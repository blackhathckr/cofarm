import type { HarvestShare } from '@cofarm/contracts/harvest';

import { ErrorNote } from '@/components/ErrorNote';
import { MoneyText } from '@/components/MoneyText';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useCycleStatement } from '../hooks/use-cycle-statement.ts';
import { formatBasisPoints } from '../share-percent.ts';

type PartnerStatementDialogProps = {
  projectId: string;
  cycleId: string;
  partner: HarvestShare;
  onClose: () => void;
};

export function PartnerStatementDialog({
  projectId,
  cycleId,
  partner,
  onClose,
}: PartnerStatementDialogProps) {
  const statement = useCycleStatement(projectId, cycleId, partner.membershipId);

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{`${partner.name} · published statement`}</DialogTitle>
          <DialogDescription>
            The figures the partner sees for this cycle, as issued at publish.
          </DialogDescription>
        </DialogHeader>

        <ErrorNote error={statement.error} />

        {statement.data === undefined ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Yield sold</dt>
            <dd className="tabular">{`${statement.data.yieldKg} kg to ${statement.data.buyer}`}</dd>
            <dt className="text-muted-foreground">Gross revenue</dt>
            <dd>
              <MoneyText paise={statement.data.grossRevenuePaise} showPaise />
            </dd>
            <dt className="text-muted-foreground">Net proceeds</dt>
            <dd>
              <MoneyText paise={statement.data.netProceedsPaise} showPaise />
            </dd>
            <dt className="text-muted-foreground">Partner pool</dt>
            <dd>
              <MoneyText paise={statement.data.partnerPoolPaise} showPaise />
            </dd>
            <dt className="text-muted-foreground">Contribution</dt>
            <dd>
              <MoneyText paise={statement.data.contributionPaise} showPaise />
            </dd>
            <dt className="text-muted-foreground">This cycle</dt>
            <dd>
              <MoneyText paise={statement.data.sharePaise} showPaise />
            </dd>
            <dt className="text-muted-foreground">Earned to date</dt>
            <dd>
              <MoneyText paise={statement.data.cumulativeSharePaise} showPaise />
            </dd>
            <dt className="text-muted-foreground">Return</dt>
            <dd className="tabular">{formatBasisPoints(statement.data.returnBps)}</dd>
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}
