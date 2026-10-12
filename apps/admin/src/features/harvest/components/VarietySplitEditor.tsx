import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fromHundredths, toHundredths } from '../kilogram-input.ts';
import { newVarietyRow, splitHundredths, type VarietyRow } from '../variety-split.ts';

type VarietySplitEditorProps = {
  rows: readonly VarietyRow[];
  yieldKg: string;
  disabled: boolean;
  onChange: (rows: VarietyRow[]) => void;
};

export function VarietySplitEditor({ rows, yieldKg, disabled, onChange }: VarietySplitEditorProps) {
  const split = splitHundredths(rows);
  const expected = toHundredths(yieldKg);
  const difference = expected - split;

  function patch(key: string, next: Partial<VarietyRow>): void {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...next } : row)));
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Variety split</Label>
        <Badge variant={difference === 0n ? 'default' : 'destructive'}>
          {difference === 0n
            ? `Split matches the yield at ${fromHundredths(split)} kg`
            : `Split is ${fromHundredths(split)} kg against a yield of ${fromHundredths(expected)} kg`}
        </Badge>
      </div>

      {difference === 0n ? null : (
        <p className="text-sm text-muted-foreground">
          {difference > 0n
            ? `${fromHundredths(difference)} kg of the yield is still unallocated.`
            : `${fromHundredths(-difference)} kg more than the yield has been allocated.`}
        </p>
      )}

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-wrap items-center gap-2">
            <Input
              className="min-w-48 flex-1"
              placeholder="Variety name"
              disabled={disabled}
              value={row.name}
              onChange={(event) => {
                patch(row.key, { name: event.target.value });
              }}
            />
            <Input
              className="w-40"
              inputMode="decimal"
              placeholder="Kilograms"
              disabled={disabled}
              value={row.kilograms}
              onChange={(event) => {
                patch(row.key, { kilograms: event.target.value });
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || rows.length === 1}
              onClick={() => {
                onChange(rows.filter((candidate) => candidate.key !== row.key));
              }}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => {
          onChange([...rows, newVarietyRow()]);
        }}
      >
        Add a variety
      </Button>
    </div>
  );
}
