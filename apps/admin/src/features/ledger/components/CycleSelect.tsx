import type { Cycle } from '@cofarm/contracts/projects';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ANY_VALUE } from '../expense-filters.ts';

type CycleSelectProps = {
  id: string;
  label: string;
  value: string;
  cycles: readonly Cycle[];
  unscopedLabel: string | null;
  onChange: (value: string) => void;
};

export function CycleSelect({
  id,
  label,
  value,
  cycles,
  unscopedLabel,
  onChange,
}: CycleSelectProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={unscopedLabel ?? 'Choose a cycle'} />
        </SelectTrigger>
        <SelectContent>
          {unscopedLabel === null ? null : (
            <SelectItem value={ANY_VALUE}>{unscopedLabel}</SelectItem>
          )}
          {cycles.map((cycle) => (
            <SelectItem key={cycle.id} value={cycle.id}>
              {`Cycle ${cycle.cycleNo}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
