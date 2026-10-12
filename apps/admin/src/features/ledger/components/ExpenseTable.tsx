import type { LedgerEntry } from '@cofarm/contracts/ledger';
import { cn } from 'cn';
import { COST_HEAD_LABELS } from '@cofarm/core/pnl';

import { EmptyState } from '@/components/EmptyState';
import { MoneyText } from '@/components/MoneyText';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ReceiptLink } from './ReceiptLink';

type ExpenseTableProps = {
  entries: readonly LedgerEntry[];
  onReverse: (entry: LedgerEntry) => void;
};

export function ExpenseTable({ entries, onReverse }: ExpenseTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Cost head</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Note</TableHead>
          <TableHead>Receipt</TableHead>
          <TableHead>State</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.length === 0 ? (
          <EmptyState
            colSpan={7}
            title="No expense entries match these filters"
            detail="Widen the cycle, cost head or date range, or record the first cost."
          />
        ) : null}
        {entries.map((entry) => {
          const isReversal = entry.reversesId !== null;
          const isReversed = entry.reversedByEntryId !== null;
          const excluded = isReversal || isReversed;

          return (
            <TableRow key={entry.id} className={cn(excluded && 'text-muted-foreground')}>
              <TableCell className="tabular">{entry.entryDate}</TableCell>
              <TableCell>
                {entry.costHead === null ? '—' : COST_HEAD_LABELS[entry.costHead]}
              </TableCell>
              <TableCell className="text-right">
                <MoneyText
                  paise={entry.amountPaise}
                  showPaise
                  className={cn(excluded && 'line-through')}
                />
              </TableCell>
              <TableCell className="max-w-xs truncate">{entry.note ?? '—'}</TableCell>
              <TableCell>
                {entry.documentId === null ? '—' : <ReceiptLink documentId={entry.documentId} />}
              </TableCell>
              <TableCell>
                {isReversed ? <Badge variant="destructive">Reversed</Badge> : null}
                {isReversal ? <Badge variant="secondary">Reversal</Badge> : null}
                {excluded ? null : <Badge variant="outline">Counted</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={excluded}
                  onClick={() => {
                    onReverse(entry);
                  }}
                >
                  Reverse
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
