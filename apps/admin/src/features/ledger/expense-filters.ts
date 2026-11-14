import { costHeadSchema } from '@cofarm/contracts/ledger';

import type { ExpenseFilters } from './hooks/use-expenses.ts';

/** Radix will not take an empty string as a `SelectItem` value. */
export const ANY_VALUE = 'all';

export type ExpenseFilterState = {
  cycleId: string;
  costHead: string;
  expenseHeadId: string;
  from: string;
  to: string;
};

export const EMPTY_EXPENSE_FILTERS: ExpenseFilterState = {
  cycleId: ANY_VALUE,
  costHead: ANY_VALUE,
  expenseHeadId: ANY_VALUE,
  from: '',
  to: '',
};

export function toExpenseFilters(state: ExpenseFilterState): ExpenseFilters {
  const costHead = costHeadSchema.safeParse(state.costHead);

  return {
    ...(state.cycleId === ANY_VALUE ? {} : { cycleId: state.cycleId }),
    ...(costHead.success ? { costHead: costHead.data } : {}),
    ...(state.expenseHeadId === ANY_VALUE ? {} : { expenseHeadId: state.expenseHeadId }),
    ...(state.from === '' ? {} : { from: state.from }),
    ...(state.to === '' ? {} : { to: state.to }),
  };
}
