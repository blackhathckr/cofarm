import type { LedgerEntry } from '@cofarm/contracts/ledger';
import { useState, type SyntheticEvent } from 'react';
import { COST_HEAD_LABELS } from '@cofarm/core/pnl';

import { ErrorNote } from '@/components/ErrorNote';
import { MoneyText } from '@/components/MoneyText';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useReverseExpense } from '../hooks/use-expenses.ts';

type ReverseExpenseDialogProps = {
  projectId: string;
  entry: LedgerEntry;
  onClose: () => void;
};

const ALREADY_REVERSED =
  'This entry has already been reversed. Reload the list to see the reversing entry.';

export function ReverseExpenseDialog({ projectId, entry, onClose }: ReverseExpenseDialogProps) {
  const [reason, setReason] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const reverse = useReverseExpense(projectId);

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setInvalid('Give a reason of at least three characters');
      return;
    }
    setInvalid(null);
    reverse.mutate({ entryId: entry.id, body: { note: trimmed } }, { onSuccess: onClose });
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reverse this expense</DialogTitle>
          <DialogDescription>
            The ledger is append-only. This appends a cancelling entry; both rows stay on the record
            and neither counts towards the totals.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-2 rounded-lg border bg-muted p-4 text-sm">
          <dt className="text-muted-foreground">Cost head</dt>
          <dd>{entry.costHead === null ? '—' : COST_HEAD_LABELS[entry.costHead]}</dd>
          <dt className="text-muted-foreground">Amount</dt>
          <dd>
            <MoneyText paise={entry.amountPaise} showPaise />
          </dd>
          <dt className="text-muted-foreground">Entry date</dt>
          <dd className="tabular">{entry.entryDate}</dd>
          <dt className="text-muted-foreground">Note</dt>
          <dd>{entry.note ?? '—'}</dd>
        </dl>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1">
            <Label htmlFor="reverse-reason">Reason</Label>
            <Textarea
              id="reverse-reason"
              rows={3}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
              }}
            />
          </div>

          {invalid === null ? (
            <ErrorNote error={reverse.error} conflict={ALREADY_REVERSED} />
          ) : (
            <p className="text-sm font-medium text-destructive" role="alert">
              {invalid}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={reverse.isPending}>
              {reverse.isPending ? 'Reversing…' : 'Append reversal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
