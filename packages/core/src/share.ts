import type { Paise } from './money.ts';

export type ProRataInput = {
  key: string;
  weight: bigint;
};

export type ProRataShare = {
  key: string;
  weight: bigint;
  amount: Paise;
};

/**
 * Splits an amount in proportion to weights using the largest-remainder
 * method, so the parts sum to the whole exactly. Plain integer division would
 * leave paise stranded, and a partner whose share does not reconcile against
 * the pool is a support ticket every cycle.
 *
 * Ties go to the earlier entry, which keeps repeated runs identical.
 */
export function splitProRata(total: Paise, entries: readonly ProRataInput[]): ProRataShare[] {
  if (entries.some((entry) => entry.weight < 0n)) {
    throw new Error('Pro-rata weights cannot be negative');
  }

  const totalWeight = entries.reduce<bigint>((sum, entry) => sum + entry.weight, 0n);
  if (totalWeight === 0n) {
    if (total !== 0n) {
      throw new Error('Cannot split a non-zero amount across zero total weight');
    }
    return entries.map((entry) => ({ key: entry.key, weight: entry.weight, amount: 0n }));
  }

  const negative = total < 0n;
  const magnitude = negative ? -total : total;

  const quotients = entries.map((entry) => {
    const scaled = magnitude * entry.weight;
    return {
      key: entry.key,
      weight: entry.weight,
      base: scaled / totalWeight,
      remainder: scaled % totalWeight,
    };
  });

  const distributed = quotients.reduce<bigint>((sum, part) => sum + part.base, 0n);
  let leftover = magnitude - distributed;

  const order = quotients
    .map((part, index) => ({ index, remainder: part.remainder }))
    .sort((a, b) => {
      if (a.remainder === b.remainder) return a.index - b.index;
      return a.remainder > b.remainder ? -1 : 1;
    });

  const bonus = new Set<number>();
  for (const candidate of order) {
    if (leftover <= 0n) break;
    bonus.add(candidate.index);
    leftover -= 1n;
  }

  return quotients.map((part, index) => {
    const amount = part.base + (bonus.has(index) ? 1n : 0n);
    return { key: part.key, weight: part.weight, amount: negative ? -amount : amount };
  });
}
