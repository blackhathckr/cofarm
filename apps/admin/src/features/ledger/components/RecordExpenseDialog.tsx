import type { Cycle } from '@cofarm/contracts/projects';
import type { CostHead } from '@cofarm/core/pnl';
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
import { ANY_VALUE } from '../expense-filters.ts';
import { useRecordExpense } from '../hooks/use-expenses.ts';
import { CostHeadSelect } from './CostHeadSelect';
import { CycleSelect } from './CycleSelect';
import { DocumentPicker } from './DocumentPicker';
import { EntryDateField } from './EntryDateField';
import { InvalidNote } from './InvalidNote';
import { NoteField } from './NoteField';
import { RupeeField } from './RupeeField';

type RecordExpenseDialogProps = {
  projectId: string;
  cycles: readonly Cycle[];
};

type ExpenseDraft = {
  cycleId: string;
  costHead: CostHead | null;
  rupees: string;
  entryDate: string;
  note: string;
  documentId: string | null;
};

const EMPTY_DRAFT: ExpenseDraft = {
  cycleId: ANY_VALUE,
  costHead: null,
  rupees: '',
  entryDate: indiaToday(),
  note: '',
  documentId: null,
};

export function RecordExpenseDialog({ projectId, cycles }: RecordExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ExpenseDraft>(EMPTY_DRAFT);
  const [invalid, setInvalid] = useState<string | null>(null);
  const record = useRecordExpense(projectId);

  const amount = parseRupeeAmount(draft.rupees);

  function patch(next: Partial<ExpenseDraft>): void {
    setDraft((current) => ({ ...current, ...next }));
  }

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (draft.costHead === null) {
      setInvalid('Choose a cost head');
      return;
    }
    if (amount.error !== null) {
      setInvalid(amount.error);
      return;
    }
    setInvalid(null);

    record.mutate(
      {
        costHead: draft.costHead,
        amountPaise: amount.paise,
        entryDate: draft.entryDate,
        ...(draft.cycleId === ANY_VALUE ? {} : { cycleId: draft.cycleId }),
        ...(draft.note.trim() === '' ? {} : { note: draft.note.trim() }),
        ...(draft.documentId === null ? {} : { documentId: draft.documentId }),
      },
      {
        onSuccess: () => {
          setDraft({ ...EMPTY_DRAFT, entryDate: draft.entryDate });
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
        <Button type="button">Record expense</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record an expense</DialogTitle>
          <DialogDescription>
            Entries are appended and never edited. A past date is allowed for backfill.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <CostHeadSelect
            id="expense-head"
            value={draft.costHead}
            onChange={(costHead) => {
              patch({ costHead });
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <RupeeField
              id="expense-amount"
              label="Amount in rupees"
              value={draft.rupees}
              amount={amount}
              onChange={(rupees) => {
                patch({ rupees });
              }}
            />
            <EntryDateField
              id="expense-date"
              label="Entry date"
              value={draft.entryDate}
              onChange={(entryDate) => {
                patch({ entryDate });
              }}
            />
          </div>

          <CycleSelect
            id="expense-cycle"
            label="Cycle"
            value={draft.cycleId}
            cycles={cycles}
            unscopedLabel="Not tied to a cycle"
            onChange={(cycleId) => {
              patch({ cycleId });
            }}
          />

          <NoteField
            id="expense-note"
            label="Note"
            value={draft.note}
            onChange={(note) => {
              patch({ note });
            }}
          />

          <DocumentPicker
            label="Receipt"
            projectId={projectId}
            type="other"
            documentId={draft.documentId}
            onUploaded={(documentId) => {
              patch({ documentId });
            }}
          />

          <InvalidNote invalid={invalid} error={record.error} />

          <DialogFooter>
            <Button type="submit" disabled={record.isPending}>
              {record.isPending ? 'Recording…' : 'Record expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
