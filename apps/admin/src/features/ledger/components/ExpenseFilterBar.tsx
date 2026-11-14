import type { ExpenseHead } from '@cofarm/contracts/expense-heads';
import { costHeadSchema } from '@cofarm/contracts/ledger';
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
import { topHeads } from '@/lib/expense-heads.ts';
import { ANY_VALUE, EMPTY_EXPENSE_FILTERS, type ExpenseFilterState } from '../expense-filters.ts';
import { CycleSelect } from './CycleSelect';

type ExpenseFilterBarProps = {
  cycles: readonly Cycle[];
  heads: readonly ExpenseHead[];
  value: ExpenseFilterState;
  onChange: (next: ExpenseFilterState) => void;
};

export function ExpenseFilterBar({ cycles, heads, value, onChange }: ExpenseFilterBarProps) {
  const category = costHeadSchema.safeParse(value.costHead);
  const headOptions = category.success ? topHeads(heads, category.data) : [];

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6">
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
        <Label htmlFor="filter-category">Category</Label>
        <Select
          value={value.costHead}
          onValueChange={(costHead) => {
            onChange({ ...value, costHead, expenseHeadId: ANY_VALUE });
          }}
        >
          <SelectTrigger id="filter-category" className="w-full">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>All categories</SelectItem>
            {COST_HEADS.map((head) => (
              <SelectItem key={head} value={head}>
                {COST_HEAD_LABELS[head]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-head">Expense</Label>
        <Select
          value={value.expenseHeadId}
          disabled={headOptions.length === 0}
          onValueChange={(expenseHeadId) => {
            onChange({ ...value, expenseHeadId });
          }}
        >
          <SelectTrigger id="filter-head" className="w-full">
            <SelectValue placeholder="All expenses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>All expenses</SelectItem>
            {headOptions.map((head) => (
              <SelectItem key={head.id} value={head.id}>
                {head.name}
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
