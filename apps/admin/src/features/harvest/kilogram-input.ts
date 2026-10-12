/**
 * Weight carries two decimal places and crosses the wire as a decimal string.
 * Comparisons run in hundredths of a kilogram so the variety split matches the
 * total yield exactly, the same arithmetic the API applies.
 */
export type KilogramAmount = { kg: string; error: null } | { kg: null; error: string };

const KILOGRAM_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

export function parseKilograms(input: string): KilogramAmount {
  const cleaned = input.replace(/[\s,]/g, '');
  if (cleaned === '') return { kg: null, error: 'Enter a weight in kilograms' };
  if (!KILOGRAM_PATTERN.test(cleaned)) {
    return { kg: null, error: 'Enter kilograms with at most two decimal places' };
  }
  if (!/[1-9]/.test(cleaned)) return { kg: null, error: 'Enter a weight greater than zero' };
  return { kg: cleaned, error: null };
}

export function toHundredths(kilograms: string): bigint {
  const [whole = '0', fraction = ''] = kilograms.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

export function fromHundredths(hundredths: bigint): string {
  const negative = hundredths < 0n;
  const absolute = negative ? -hundredths : hundredths;
  const body = `${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
  return negative ? `-${body}` : body;
}
