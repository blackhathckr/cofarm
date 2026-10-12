import type { PartnerStatement } from '@cofarm/contracts/harvest';
import { COST_HEADS, COST_HEAD_LABELS } from '@cofarm/core/pnl';
import { Text, View } from 'react-native';

import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { MoneyText } from '@/components/ui/MoneyText';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { formatBasisPoints } from '../basis-points.ts';

type PnlBreakdownProps = {
  statement: PartnerStatement;
};

const AMOUNT = 'text-base font-bold text-foreground';
const AMOUNT_EMPHASISED = 'text-lg font-extrabold text-foreground';

export function PnlBreakdown({ statement }: PnlBreakdownProps) {
  return (
    <View className="gap-3 rounded-3xl bg-surface p-5">
      <SectionHeader title="Profit and loss" action={`Cycle ${statement.cycleNo}`} />

      <View className="gap-2">
        <KeyValueRow
          label="Gross harvest sale"
          value={<MoneyText paise={statement.grossRevenuePaise} className={AMOUNT} />}
        />

        {COST_HEADS.map((head) => (
          <KeyValueRow
            key={head}
            label={COST_HEAD_LABELS[head]}
            value={<MoneyText paise={statement.costsByHead[head] ?? '0'} className={AMOUNT} />}
          />
        ))}

        <KeyValueRow
          label="Total cost"
          value={<MoneyText paise={statement.totalCostPaise} className={AMOUNT_EMPHASISED} />}
          emphasis
        />
        <KeyValueRow
          label="Net proceeds"
          value={<MoneyText paise={statement.netProceedsPaise} className={AMOUNT_EMPHASISED} />}
          emphasis
        />
        <KeyValueRow
          label={`Kiaan's share (${formatBasisPoints(statement.kiaanShareBps)})`}
          value={<MoneyText paise={statement.kiaanSharePaise} className={AMOUNT} />}
        />
        <KeyValueRow
          label="Partner pool"
          value={<MoneyText paise={statement.partnerPoolPaise} className={AMOUNT} />}
        />
        <KeyValueRow
          label="Your contribution"
          value={<MoneyText paise={statement.contributionPaise} className={AMOUNT} />}
        />
        <KeyValueRow
          label="Your share"
          value={<MoneyText paise={statement.sharePaise} className={AMOUNT_EMPHASISED} />}
          emphasis
          className="border-b-0 pb-0"
        />
      </View>

      <Text className="text-xs text-muted">
        {`Your share of the partner pool, pro-rata to your contribution — a return of ${formatBasisPoints(statement.returnBps)} on this cycle. Other partners' shares are not shown.`}
      </Text>
    </View>
  );
}
