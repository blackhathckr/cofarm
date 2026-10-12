import type { HarvestPreview } from '@cofarm/contracts/harvest';
import { COST_HEAD_LABELS, COST_HEADS } from '@cofarm/core/pnl';

import { MoneyText } from '@/components/MoneyText';
import { StatTile } from '@/components/StatTile';
import { Table, TableBody, TableCell, TableFooter, TableRow } from '@/components/ui/table';
import { formatBasisPoints } from '../share-percent.ts';

type PnlTotalsProps = {
  preview: HarvestPreview;
};

export function PnlTotals({ preview }: PnlTotalsProps) {
  const isLoss = BigInt(preview.netProceedsPaise) < 0n;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile
          label="Gross revenue"
          value={<MoneyText paise={preview.grossRevenuePaise} showPaise />}
          hint="yield times realised price"
          tone="sage"
        />
        <StatTile
          label="Total cost"
          value={<MoneyText paise={preview.totalCostPaise} showPaise />}
        />
        <StatTile
          label="Net proceeds"
          value={<MoneyText paise={preview.netProceedsPaise} showPaise />}
          hint={isLoss ? 'a loss splits in the same proportion' : 'gross revenue less total cost'}
          tone={isLoss ? 'clay' : 'sage'}
        />
        <StatTile
          label="Kiaan share"
          value={<MoneyText paise={preview.kiaanSharePaise} showPaise />}
          hint={`${formatBasisPoints(preview.kiaanShareBps)} of net proceeds`}
          tone="clay"
        />
        <StatTile
          label="Partner pool"
          value={<MoneyText paise={preview.partnerPoolPaise} showPaise />}
          hint="divided pro-rata by contribution"
          tone="sage"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableBody>
            {COST_HEADS.map((head) => (
              <TableRow key={head}>
                <TableCell>{COST_HEAD_LABELS[head]}</TableCell>
                <TableCell className="text-right">
                  <MoneyText paise={preview.costsByHead[head] ?? '0'} showPaise />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Total cost</TableCell>
              <TableCell className="text-right font-semibold">
                <MoneyText paise={preview.totalCostPaise} showPaise />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
