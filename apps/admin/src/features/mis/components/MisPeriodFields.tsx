import { financialYearLabel, misPeriodOf } from '@cofarm/contracts/mis';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const QUARTERS = [
  { quarter: 1, months: 'Apr – Jun' },
  { quarter: 2, months: 'Jul – Sep' },
  { quarter: 3, months: 'Oct – Dec' },
  { quarter: 4, months: 'Jan – Mar' },
] as const;
const YEARS_BACK = 3;

type MisPeriodFieldsProps = {
  quarter: number;
  year: number;
  problem: string | null;
  onQuarterChange: (quarter: number) => void;
  onYearChange: (year: number) => void;
};

export function MisPeriodFields({
  quarter,
  year,
  problem,
  onQuarterChange,
  onYearChange,
}: MisPeriodFieldsProps) {
  const now = new Date();
  const current = misPeriodOf(now.getFullYear(), now.getMonth() + 1).year;
  const years = Array.from({ length: YEARS_BACK + 1 }, (_, index) => current - index);

  return (
    <div className="space-y-2">
      <Label>Period</Label>
      <div className="grid grid-cols-2 gap-3">
        <Select
          value={String(year)}
          onValueChange={(next) => {
            onYearChange(Number(next));
          }}
        >
          <SelectTrigger aria-label="Financial year">
            <SelectValue placeholder="Financial year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {financialYearLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(quarter)}
          onValueChange={(next) => {
            onQuarterChange(Number(next));
          }}
        >
          <SelectTrigger aria-label="Quarter">
            <SelectValue placeholder="Quarter" />
          </SelectTrigger>
          <SelectContent>
            {QUARTERS.map((option) => (
              <SelectItem key={option.quarter} value={String(option.quarter)}>
                {`Q${String(option.quarter)} (${option.months})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {problem === null ? null : (
        <p role="alert" className="text-xs text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
}
