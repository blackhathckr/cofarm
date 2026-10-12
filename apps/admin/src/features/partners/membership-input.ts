import { pctToBasisPoints, rupeesToPaise } from '@cofarm/core/money';

/** Operators type rupees; the wire format is an integer-paise string. */
const RUPEE_AMOUNT = /^\d{1,17}(\.\d{1,2})?$/;
const PERCENTAGE = /^\d{1,3}(\.\d{1,2})?$/;

export function paiseFromRupees(rupees: string): string | null {
  const trimmed = rupees.trim();
  if (!RUPEE_AMOUNT.test(trimmed)) return null;
  return rupeesToPaise(trimmed).toString();
}

export function bpsFromPct(percent: string): number | null {
  const trimmed = percent.trim();
  if (!PERCENTAGE.test(trimmed)) return null;
  const value = Number(trimmed);
  if (value > 100) return null;
  return pctToBasisPoints(value);
}
