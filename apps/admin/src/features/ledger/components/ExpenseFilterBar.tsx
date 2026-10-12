import type { Cycle } from '@cofarm/contracts/projects';
import { COST_HEAD_LABELS, COST_HEADS } from '@cofarm/core/pnl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ANY_VALUE, EMPTY_EXPENSE_FILTERS, type ExpenseFilterState } from '../expense-filters.ts';
import { CycleSelect } from './CycleSelect';

type ExpenseFilterBarProps = {
  cycles: readonly Cycle[];
  value: ExpenseFilterState;
  onChange: (next: ExpenseFilterState) => void;
};

export function ExpenseFilterBar({ cycles, value, onChange }: ExpenseFilterBarProps) {
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
      <CycleSelect
        id="filter-cycle"
        label="Cycle"
        value={value.cycleId}
        cycles={cycles}
        unscopedLabel="All cycles"
        onChange={(cycleId) => {
          onChange({ ...value, cycleId });
        }}
      />

      <div className="space-y-1">
        <Label htmlFor="filter-head">Cost head</Label>
        <Select
          value={value.costHead}
          onValueChange={(costHead) => {
            onChange({ ...value, costHead });
          }}
        >
          <SelectTrigger id="filter-head" className="w-full">
            <SelectValue placeholder="All cost heads" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>All cost heads</SelectItem>
            {COST_HEADS.map((head) => (
              <SelectItem key={head} value={head}>
                {COST_HEAD_LABELS[head]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-from">From</Label>
        <Input
          id="filter-from"
          type="date"
          value={value.from}
          onChange={(event) => {
            onChange({ ...value, from: event.target.value });
          }}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-to">To</Label>
        <Input
          id="filter-to"
          type="date"
          value={value.to}
          onChange={(event) => {
            onChange({ ...value, to: event.target.value });
          }}
        />
      </div>

      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onChange(EMPTY_EXPENSE_FILTERS);
          }}
        >
          Clear filters
        </Button>
      </div>
    </div>
  );
}
