import { rupeesToPaise } from '@cofarm/core/money';

/** Rupees reach the form as typed text and leave as integer paise: a float in
 * between would move money. */
export type RupeeAmount = { paise: string; error: null } | { paise: null; error: string };

const RUPEE_PATTERN = /^\d{1,13}(\.\d{1,2})?$/;

export function parseRupeeAmount(input: string): RupeeAmount {
  const cleaned = input.replace(/[\s,₹]/g, '');
  if (cleaned === '') return { paise: null, error: 'Enter an amount in rupees' };
  if (!RUPEE_PATTERN.test(cleaned)) {
    return { paise: null, error: 'Enter rupees with at most two decimal places' };
  }

  const paise = rupeesToPaise(cleaned);
  if (paise <= 0n) return { paise: null, error: 'Enter an amount greater than zero' };
  return { paise: paise.toString(), error: null };
}
