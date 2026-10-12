import { MoneyText } from '@/components/MoneyText';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RupeeAmount } from '@/lib/rupee-input.ts';

type RupeeFieldProps = {
  id: string;
  label: string;
  value: string;
  amount: RupeeAmount;
  onChange: (value: string) => void;
};

export function RupeeField({ id, label, value, amount, onChange }: RupeeFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        placeholder="125000.50"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      {amount.error === null ? (
        <p className="text-xs text-muted-foreground">
          Posts as <MoneyText paise={amount.paise} showPaise />
        </p>
      ) : null}
    </div>
  );
}
