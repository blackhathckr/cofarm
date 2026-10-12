import { costHeadSchema } from '@cofarm/contracts/ledger';
import { COST_HEAD_LABELS, COST_HEADS, type CostHead } from '@cofarm/core/pnl';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CostHeadSelectProps = {
  id: string;
  value: CostHead | null;
  onChange: (costHead: CostHead) => void;
};

export function CostHeadSelect({ id, value, onChange }: CostHeadSelectProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>Cost head</Label>
      <Select
        value={value ?? ''}
        onValueChange={(next) => {
          const parsed = costHeadSchema.safeParse(next);
          if (parsed.success) onChange(parsed.data);
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Choose a cost head" />
        </SelectTrigger>
        <SelectContent>
          {COST_HEADS.map((head) => (
            <SelectItem key={head} value={head}>
              {COST_HEAD_LABELS[head]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
