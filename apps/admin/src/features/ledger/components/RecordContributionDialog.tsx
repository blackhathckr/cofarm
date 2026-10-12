import type { ProjectPartner } from '@cofarm/contracts/partners';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { indiaToday } from '@/lib/india-date.ts';
import { parseRupeeAmount } from '@/lib/rupee-input.ts';
import { useRecordContribution } from '../hooks/use-contributions.ts';
import { DocumentPicker } from './DocumentPicker';
import { EntryDateField } from './EntryDateField';
import { InvalidNote } from './InvalidNote';
import { NoteField } from './NoteField';
import { RupeeField } from './RupeeField';

type RecordContributionDialogProps = {
  projectId: string;
  partners: readonly ProjectPartner[];
};

export function RecordContributionDialog({ projectId, partners }: RecordContributionDialogProps) {
  const [open, setOpen] = useState(false);
  const [membershipId, setMembershipId] = useState('');
  const [rupees, setRupees] = useState('');
  const [entryDate, setEntryDate] = useState(indiaToday());
  const [note, setNote] = useState('');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const record = useRecordContribution(projectId);

  const amount = parseRupeeAmount(rupees);

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (membershipId === '') {
      setInvalid('Choose the partner who paid');
      return;
    }
    if (amount.error !== null) {
      setInvalid(amount.error);
      return;
    }
    setInvalid(null);

    record.mutate(
      {
        membershipId,
        amountPaise: amount.paise,
        entryDate,
        ...(note.trim() === '' ? {} : { note: note.trim() }),
        ...(documentId === null ? {} : { documentId }),
      },
      {
        onSuccess: () => {
          setRupees('');
          setNote('');
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
        <Button type="button">Record contribution</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record a contribution</DialogTitle>
          <DialogDescription>
            Money received from a partner against their membership on this project.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1">
            <Label htmlFor="contribution-partner">Partner</Label>
            <Select value={membershipId} onValueChange={setMembershipId}>
              <SelectTrigger id="contribution-partner" className="w-full">
                <SelectValue placeholder="Choose a partner" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((partner) => (
                  <SelectItem key={partner.membershipId} value={partner.membershipId}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <RupeeField
              id="contribution-amount"
              label="Amount in rupees"
              value={rupees}
              amount={amount}
              onChange={setRupees}
            />
            <EntryDateField
              id="contribution-date"
              label="Received on"
              value={entryDate}
              onChange={setEntryDate}
            />
          </div>

          <NoteField id="contribution-note" label="Note" value={note} onChange={setNote} />

          <DocumentPicker
            label="Receipt"
            projectId={projectId}
            type="other"
            documentId={documentId}
            onUploaded={setDocumentId}
          />

          <InvalidNote invalid={invalid} error={record.error} />

          <DialogFooter>
            <Button type="submit" disabled={record.isPending}>
              {record.isPending ? 'Recording…' : 'Record contribution'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
