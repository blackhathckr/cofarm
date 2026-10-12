import type { VarietySplit } from '@cofarm/contracts/harvest';

import { fromHundredths, parseKilograms, toHundredths } from './kilogram-input.ts';

export type VarietyRow = {
  key: string;
  name: string;
  kilograms: string;
};

export type VarietySplitResult =
  { split: VarietySplit; error: null } | { split: null; error: string };

export function newVarietyRow(): VarietyRow {
  return { key: crypto.randomUUID(), name: '', kilograms: '' };
}

export function toVarietyRows(split: VarietySplit): VarietyRow[] {
  const rows = Object.entries(split).map(([name, kilograms]) => ({
    key: crypto.randomUUID(),
    name,
    kilograms,
  }));
  return rows.length === 0 ? [newVarietyRow()] : rows;
}

export function splitHundredths(rows: readonly VarietyRow[]): bigint {
  return rows.reduce<bigint>((total, row) => {
    const parsed = parseKilograms(row.kilograms);
    return parsed.error === null ? total + toHundredths(parsed.kg) : total;
  }, 0n);
}

export function buildVarietySplit(
  rows: readonly VarietyRow[],
  yieldKg: string,
): VarietySplitResult {
  const split: Record<string, string> = {};

  for (const row of rows) {
    const name = row.name.trim();
    if (name === '') return { split: null, error: 'Name every variety in the split' };
    if (name in split) return { split: null, error: `${name} appears twice in the split` };

    const parsed = parseKilograms(row.kilograms);
    if (parsed.error !== null) return { split: null, error: `${name}: ${parsed.error}` };
    split[name] = parsed.kg;
  }

  if (Object.keys(split).length === 0) return { split: null, error: 'Name at least one variety' };

  const total = splitHundredths(rows);
  const expected = toHundredths(yieldKg);
  if (total !== expected) {
    return {
      split: null,
      error: `The variety split totals ${fromHundredths(total)} kg against a yield of ${yieldKg} kg`,
    };
  }

  return { split, error: null };
}
