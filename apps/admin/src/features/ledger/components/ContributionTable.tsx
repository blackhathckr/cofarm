import type { LedgerEntry } from '@cofarm/contracts/ledger';
import type { ProjectPartner } from '@cofarm/contracts/partners';
import { cn } from 'cn';

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

type ContributionTableProps = {
  entries: readonly LedgerEntry[];
  partners: readonly ProjectPartner[];
  onReverse: (entry: LedgerEntry) => void;
};

export function ContributionTable({ entries, partners, onReverse }: ContributionTableProps) {
  const names = new Map(partners.map((partner) => [partner.membershipId, partner.name]));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Received on</TableHead>
          <TableHead>Partner</TableHead>
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
            title="No contributions have been recorded yet"
            detail="Record money received from a partner against their membership on this project."
          />
        ) : null}
        {entries.map((entry) => {
          const excluded = entry.reversesId !== null || entry.reversedByEntryId !== null;

          return (
            <TableRow key={entry.id} className={cn(excluded && 'text-muted-foreground')}>
              <TableCell className="tabular">{entry.entryDate}</TableCell>
              <TableCell>
                {entry.membershipId === null ? '—' : (names.get(entry.membershipId) ?? 'Unknown')}
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
                {entry.reversedByEntryId === null ? null : (
                  <Badge variant="destructive">Reversed</Badge>
                )}
                {entry.reversesId === null ? null : <Badge variant="secondary">Reversal</Badge>}
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
