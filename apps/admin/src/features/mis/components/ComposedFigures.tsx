import { MILESTONE_LABELS } from '@cofarm/core/cycle';
import type { MisComposePayload } from '@cofarm/contracts/mis';
import { COST_HEAD_LABELS } from '@cofarm/core/pnl';

import { MoneyText } from '@/components/MoneyText';
import { ProgressBar } from '@/components/ProgressBar';
import { StatTile } from '@/components/StatTile';
import { Badge } from '@/components/ui/badge';

type ComposedFiguresProps = {
  payload: MisComposePayload;
};

const FIGURE_LABELS: Record<string, string> = {
  cost_totals: 'cost totals',
  update_count: 'the update count',
};

export function ComposedFigures({ payload }: ComposedFiguresProps) {
  const { costs, milestone } = payload;

  return (
    <div className="space-y-4">
      {payload.unavailableFigures.length === 0 ? null : (
        <p className="rounded-md bg-clay-100 p-3 text-sm text-clay-800">
          {`These figures could not be gathered and read as zero: ${payload.unavailableFigures
            .map((figure) => FIGURE_LABELS[figure] ?? figure)
            .join(', ')}.`}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Cost to date"
          value={<MoneyText paise={costs.totalPaise} />}
          hint={costs.cycleNo === null ? 'no open cycle' : `cycle ${costs.cycleNo.toString()}`}
          tone="clay"
        />
        <StatTile label="Updates posted" value={payload.updateCount} tone="sage" />
        <StatTile
          label="Stage"
          value={milestone?.activeStageLabel ?? '—'}
          hint={milestone === null ? 'no cycle open' : `cycle ${milestone.cycleNo.toString()}`}
        />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">Cost by head</h3>
        <ul className="mt-2 divide-y">
          {costs.byHead.map((entry) => (
            <li key={entry.head} className="flex items-center justify-between gap-4 py-2 text-sm">
              <span className="text-muted-foreground">{COST_HEAD_LABELS[entry.head]}</span>
              <MoneyText paise={entry.amountPaise} />
            </li>
          ))}
        </ul>
      </div>

      {milestone === null ? null : (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold">Milestone state</h3>
            <span className="tabular text-sm font-bold text-sage-600">
              {`${Math.round(milestone.progressBps / 100).toString()}%`}
            </span>
          </div>
          <ProgressBar valueBps={milestone.progressBps} />
          <div className="flex flex-wrap gap-2">
            {milestone.stages.map((stage) => (
              <Badge
                key={stage.stage}
                variant={stage.status === 'upcoming' ? 'outline' : 'secondary'}
              >
                {`${MILESTONE_LABELS[stage.stage]} · ${stage.status}`}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
