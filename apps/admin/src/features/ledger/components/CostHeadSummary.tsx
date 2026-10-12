import type { CostTotals } from '@cofarm/contracts/ledger';
import { COST_HEAD_LABELS, COST_HEADS } from '@cofarm/core/pnl';

import { MoneyText } from '@/components/MoneyText';
import { StatTile } from '@/components/StatTile';

type CostHeadSummaryProps = {
  totalsByHead: CostTotals;
  totalPaise: string;
};

export function CostHeadSummary({ totalsByHead, totalPaise }: CostHeadSummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {COST_HEADS.map((head) => (
        <StatTile
          key={head}
          label={COST_HEAD_LABELS[head]}
          value={<MoneyText paise={totalsByHead[head] ?? '0'} showPaise />}
        />
      ))}
      <StatTile
        label="Total cost"
        value={<MoneyText paise={totalPaise} showPaise />}
        hint="reversed entries excluded"
        tone="clay"
      />
    </div>
  );
}
