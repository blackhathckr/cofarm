import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const YEARS_BACK = 3;

function monthName(month: number): string {
  return new Date(Date.UTC(2000, month - 1, 1)).toLocaleString('en-IN', { month: 'long' });
}

type MisPeriodFieldsProps = {
  month: number;
  year: number;
  problem: string | null;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
};

export function MisPeriodFields({
  month,
  year,
  problem,
  onMonthChange,
  onYearChange,
}: MisPeriodFieldsProps) {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: YEARS_BACK + 1 }, (_, index) => thisYear - index);

  return (
    <div className="space-y-2">
      <Label>Period</Label>
      <div className="grid grid-cols-2 gap-3">
        <Select
          value={String(month)}
          onValueChange={(next) => {
            onMonthChange(Number(next));
          }}
        >
          <SelectTrigger aria-label="Month">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {monthName(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(year)}
          onValueChange={(next) => {
            onYearChange(Number(next));
          }}
        >
          <SelectTrigger aria-label="Year">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
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
