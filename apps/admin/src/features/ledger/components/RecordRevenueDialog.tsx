import type { Cycle } from '@cofarm/contracts/projects';
import { useState, type SyntheticEvent } from 'react';

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
import { indiaToday } from '@/lib/india-date.ts';
import { parseRupeeAmount } from '@/lib/rupee-input.ts';
import { useRecordRevenue } from '../hooks/use-record-revenue.ts';
import { CycleSelect } from './CycleSelect';
import { DocumentPicker } from './DocumentPicker';
import { EntryDateField } from './EntryDateField';
import { InvalidNote } from './InvalidNote';
import { NoteField } from './NoteField';
import { RupeeField } from './RupeeField';

type RecordRevenueDialogProps = {
  projectId: string;
  cycles: readonly Cycle[];
};

export function RecordRevenueDialog({ projectId, cycles }: RecordRevenueDialogProps) {
  const [open, setOpen] = useState(false);
  const [cycleId, setCycleId] = useState('');
  const [rupees, setRupees] = useState('');
  const [entryDate, setEntryDate] = useState(indiaToday());
  const [buyerNote, setBuyerNote] = useState('');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const record = useRecordRevenue(projectId);

  const amount = parseRupeeAmount(rupees);

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (cycleId === '') {
      setInvalid('Choose the cycle this revenue belongs to');
      return;
    }
    if (amount.error !== null) {
      setInvalid(amount.error);
      return;
    }
    setInvalid(null);

    record.mutate(
      {
        cycleId,
        amountPaise: amount.paise,
        entryDate,
        ...(buyerNote.trim() === '' ? {} : { buyerNote: buyerNote.trim() }),
        ...(documentId === null ? {} : { documentId }),
      },
      {
        onSuccess: () => {
          setRupees('');
          setBuyerNote('');
          setDocumentId(null);
          setOpen(false);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setInvalid(null);
          record.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Record revenue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record revenue</DialogTitle>
          <DialogDescription>
            Publishing a harvest already appends its sale. Use this only for revenue that reaches
            the project outside a published harvest.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <CycleSelect
            id="revenue-cycle"
            label="Cycle"
            value={cycleId}
            cycles={cycles}
            unscopedLabel={null}
            onChange={setCycleId}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <RupeeField
              id="revenue-amount"
              label="Amount in rupees"
              value={rupees}
              amount={amount}
              onChange={setRupees}
            />
            <EntryDateField
              id="revenue-date"
              label="Entry date"
              value={entryDate}
              onChange={setEntryDate}
            />
          </div>

          <NoteField
            id="revenue-buyer"
            label="Buyer note"
            value={buyerNote}
            onChange={setBuyerNote}
          />

          <DocumentPicker
            label="Invoice"
            projectId={projectId}
            type="other"
            documentId={documentId}
            onUploaded={setDocumentId}
          />

          <InvalidNote invalid={invalid} error={record.error} />

          <DialogFooter>
            <Button type="submit" disabled={record.isPending}>
              {record.isPending ? 'Recording…' : 'Record revenue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
