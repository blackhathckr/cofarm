import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { indiaToday } from '@/lib/india-date.ts';

type EntryDateFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function EntryDateField({ id, label, value, onChange }: EntryDateFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        max={indiaToday()}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </div>
  );
}
