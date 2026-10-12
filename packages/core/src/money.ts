/**
 * Rupee amounts are held as integer paise in a bigint for their whole life.
 * Nothing here ever produces a float: a rounding error in a partner's share is
 * a correctness bug, not a display nuisance.
 */

export const PAISE_PER_RUPEE = 100n;

export type Paise = bigint;

export function sumPaise(amounts: readonly Paise[]): Paise {
  return amounts.reduce<Paise>((total, amount) => total + amount, 0n);
}

export function rupeesToPaise(input: string): Paise {
  const cleaned = input.replace(/[\s,₹]/g, '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Not a rupee amount: ${input}`);
  }
  const negative = cleaned.startsWith('-');
  const [whole = '0', fraction = ''] = cleaned.replace('-', '').split('.');
  const paise = BigInt(whole) * PAISE_PER_RUPEE + BigInt(fraction.padEnd(2, '0'));
  return negative ? -paise : paise;
}

export function paiseToRupeeString(amount: Paise): string {
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const whole = absolute / PAISE_PER_RUPEE;
  const fraction = absolute % PAISE_PER_RUPEE;
  const body = fraction === 0n ? `${whole}` : `${whole}.${fraction.toString().padStart(2, '0')}`;
  return negative ? `-${body}` : body;
}

function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
}

export type FormatInrOptions = {
  showPaise?: boolean;
  bare?: boolean;
};

export function formatInr(amount: Paise, options: FormatInrOptions = {}): string {
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const whole = absolute / PAISE_PER_RUPEE;
  const fraction = absolute % PAISE_PER_RUPEE;

  const showPaise = options.showPaise ?? fraction !== 0n;
  const grouped = groupIndian(whole.toString());
  const body = showPaise ? `${grouped}.${fraction.toString().padStart(2, '0')}` : grouped;
  const prefix = (options.bare ?? false) ? '' : '₹';

  return `${negative ? '-' : ''}${prefix}${body}`;
}

export function applyBasisPoints(amount: Paise, basisPoints: number): Paise {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new Error(`Basis points out of range: ${basisPoints}`);
  }
  return (amount * BigInt(basisPoints)) / 10_000n;
}

export function pctToBasisPoints(percent: number): number {
  const basisPoints = Math.round(percent * 100);
  if (basisPoints < 0 || basisPoints > 10_000) {
    throw new Error(`Percentage out of range: ${percent}`);
  }
  return basisPoints;
}
