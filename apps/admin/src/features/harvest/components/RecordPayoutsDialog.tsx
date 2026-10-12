import { useState, type SyntheticEvent } from 'react';

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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { indiaToday } from '@/lib/india-date.ts';
import { useRecordPayouts } from '../hooks/use-record-payouts.ts';

type RecordPayoutsDialogProps = {
  projectId: string;
  harvestId: string;
  partnerPoolPaise: string;
  partnerCount: number;
};

const ALREADY_RECORDED =
  'The payouts for this cycle are already recorded. Nothing further is needed — do not retry.';

export function RecordPayoutsDialog({
  projectId,
  harvestId,
  partnerPoolPaise,
  partnerCount,
}: RecordPayoutsDialogProps) {
  const [open, setOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(indiaToday());
  const [note, setNote] = useState('');
  // One key per attempt: a retry after a timeout must not pay out twice.
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  const payouts = useRecordPayouts(projectId);

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    payouts.mutate({
      harvestId,
      idempotencyKey,
      body: { entryDate, ...(note.trim() === '' ? {} : { note: note.trim() }) },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setIdempotencyKey(crypto.randomUUID());
          payouts.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Record payouts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record that the shares were disbursed</DialogTitle>
          <DialogDescription>
            This appends one payout entry per partner for their published share. It records a
            disbursement that has already happened; it moves no money itself.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-2 rounded-lg border bg-muted p-4 text-sm">
          <dt className="text-muted-foreground">Partner pool</dt>
          <dd className="font-semibold">
            <MoneyText paise={partnerPoolPaise} showPaise />
          </dd>
          <dt className="text-muted-foreground">Partners paid</dt>
          <dd>{partnerCount}</dd>
        </dl>

        {payouts.data === undefined ? (
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1">
              <Label htmlFor="payout-date">Disbursed on</Label>
              <Input
                id="payout-date"
                type="date"
                max={indiaToday()}
                value={entryDate}
                onChange={(event) => {
                  setEntryDate(event.target.value);
                }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="payout-note">Note</Label>
              <Textarea
                id="payout-note"
                rows={2}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                }}
              />
            </div>

            <ErrorNote error={payouts.error} conflict={ALREADY_RECORDED} />

            <DialogFooter>
              <Button type="submit" disabled={payouts.isPending}>
                {payouts.isPending ? 'Recording…' : 'Record payouts'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              {`${payouts.data.recordedCount} payout entries appended, totalling `}
              <MoneyText paise={payouts.data.totalPaise} showPaise />
              {'.'}
            </p>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
