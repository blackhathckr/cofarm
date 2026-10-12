import type { LedgerSummary } from '@cofarm/contracts/ledger';

import { MoneyText } from '@/components/MoneyText';
import { StatTile } from '@/components/StatTile';

type LedgerPositionStripProps = {
  summary: LedgerSummary;
};

export function LedgerPositionStrip({ summary }: LedgerPositionStripProps) {
  const isLoss = BigInt(summary.netProceedsPaise) < 0n;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Gross revenue"
        value={<MoneyText paise={summary.grossRevenuePaise} showPaise />}
        tone="sage"
      />
      <StatTile label="Total cost" value={<MoneyText paise={summary.totalCostPaise} showPaise />} />
      <StatTile
        label="Net proceeds"
        value={<MoneyText paise={summary.netProceedsPaise} showPaise />}
        hint={isLoss ? 'a loss splits in the same proportion' : 'gross revenue less total cost'}
        tone={isLoss ? 'clay' : 'sage'}
      />
      <StatTile
        label="Contributions received"
        value={<MoneyText paise={summary.contributionsPaise} showPaise />}
      />
    </div>
  );
}
