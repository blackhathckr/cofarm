import type { CostHead } from '@cofarm/core/pnl';

import { CostHeadSelect } from '@/components/CostHeadSelect';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { activeOnly, subHeads, topHeads, useExpenseHeads } from '@/lib/expense-heads.ts';

export type HeadChoice = {
  costHead: CostHead | null;
  headId: string | null;
  subHeadId: string | null;
};

export const EMPTY_HEAD_CHOICE: HeadChoice = { costHead: null, headId: null, subHeadId: null };

/** Radix will not take an empty string as a `SelectItem` value. */
const NO_SUB_HEAD = 'none';

type ExpenseHeadPickerProps = {
  idPrefix: string;
  value: HeadChoice;
  onChange: (next: HeadChoice) => void;
};

export function ExpenseHeadPicker({ idPrefix, value, onChange }: ExpenseHeadPickerProps) {
  const heads = activeOnly(useExpenseHeads().data ?? []);
  const headOptions = value.costHead === null ? [] : topHeads(heads, value.costHead);
  const subHeadOptions = value.headId === null ? [] : subHeads(heads, value.headId);

  return (
    <div className="space-y-4">
      <CostHeadSelect
        id={`${idPrefix}-category`}
        label="Category"
        value={value.costHead}
        onChange={(costHead) => {
          onChange({ costHead, headId: null, subHeadId: null });
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-head`}>Expense</Label>
          <Select
            value={value.headId ?? ''}
            disabled={headOptions.length === 0}
            onValueChange={(headId) => {
              onChange({ ...value, headId, subHeadId: null });
            }}
          >
            <SelectTrigger id={`${idPrefix}-head`} className="w-full">
              <SelectValue
                placeholder={
                  value.costHead === null ? 'Choose a category first' : 'Choose an expense'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {headOptions.map((head) => (
                <SelectItem key={head.id} value={head.id}>
                  {head.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {subHeadOptions.length === 0 ? null : (
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-sub-head`}>Detail</Label>
            <Select
              value={value.subHeadId ?? NO_SUB_HEAD}
              onValueChange={(subHeadId) => {
                onChange({ ...value, subHeadId: subHeadId === NO_SUB_HEAD ? null : subHeadId });
              }}
            >
              <SelectTrigger id={`${idPrefix}-sub-head`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SUB_HEAD}>None</SelectItem>
                {subHeadOptions.map((head) => (
                  <SelectItem key={head.id} value={head.id}>
                    {head.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
