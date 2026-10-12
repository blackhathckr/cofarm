import type { LedgerEntry } from '@cofarm/contracts/ledger';
import { useMemo, useState } from 'react';

import { ErrorNote } from '@/components/ErrorNote';
import { LoadMore } from '@/components/LoadMore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectCycles } from '@/lib/project-cycles.ts';
import { CostHeadSummary } from '../components/CostHeadSummary';
import { ExpenseFilterBar } from '../components/ExpenseFilterBar';
import { ExpenseTable } from '../components/ExpenseTable';
import { LedgerPositionStrip } from '../components/LedgerPositionStrip';
import { RecordExpenseDialog } from '../components/RecordExpenseDialog';
import { RecordRevenueDialog } from '../components/RecordRevenueDialog';
import { ReverseExpenseDialog } from '../components/ReverseExpenseDialog';
import {
  EMPTY_EXPENSE_FILTERS,
  toExpenseFilters,
  type ExpenseFilterState,
} from '../expense-filters.ts';
import { useExpenses } from '../hooks/use-expenses.ts';
import { useLedgerSummary } from '../hooks/use-ledger-summary.ts';

type ExpensesPageProps = {
  projectId: string;
};

export function ExpensesPage({ projectId }: ExpensesPageProps) {
  const [filters, setFilters] = useState<ExpenseFilterState>(EMPTY_EXPENSE_FILTERS);
  const [reversing, setReversing] = useState<LedgerEntry | null>(null);

  const query = useMemo(() => toExpenseFilters(filters), [filters]);
  const cycles = useProjectCycles(projectId);
  const expenses = useExpenses(projectId, query);
  const summary = useLedgerSummary(projectId, query.cycleId);

  const firstPage = expenses.firstPage;
  const entries = expenses.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Every cost booked against this project, by cost head.
          </p>
        </div>
        <div className="flex gap-2">
          <RecordRevenueDialog projectId={projectId} cycles={cycles.data ?? []} />
          <RecordExpenseDialog projectId={projectId} cycles={cycles.data ?? []} />
        </div>
      </div>

      {firstPage === undefined ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <CostHeadSummary totalsByHead={firstPage.totalsByHead} totalPaise={firstPage.totalPaise} />
      )}

      {summary.data === undefined ? null : <LedgerPositionStrip summary={summary.data} />}

      <Alert>
        <AlertTitle>Totals exclude reversed pairs</AlertTitle>
        <AlertDescription>
          A reversed entry and the entry reversing it both stay listed, struck through, and neither
          counts towards the totals above. The totals will not match the sum of the rows you can
          see, and that is intended.
        </AlertDescription>
      </Alert>

      <ExpenseFilterBar cycles={cycles.data ?? []} value={filters} onChange={setFilters} />

      <ErrorNote error={expenses.error} />

      {expenses.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <ExpenseTable entries={entries} onReverse={setReversing} />
          <LoadMore paging={expenses} label="Load older entries" />
        </div>
      )}

      {reversing === null ? null : (
        <ReverseExpenseDialog
          projectId={projectId}
          entry={reversing}
          onClose={() => {
            setReversing(null);
          }}
        />
      )}
    </div>
  );
}
