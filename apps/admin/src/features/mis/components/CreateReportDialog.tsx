import type { MisReport } from '@cofarm/contracts/mis';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateReport, type ReportDraft } from '../hooks/use-create-report.ts';
import { MisNarrativeFields } from './MisNarrativeFields';
import { MisPdfField } from './MisPdfField';
import { MisPeriodFields } from './MisPeriodFields';

type CreateReportDialogProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (report: MisReport) => void;
};

function emptyDraft(): ReportDraft {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    title: '',
    source: 'uploaded',
    narrative: '',
    outlook: '',
    file: null,
  };
}

export function CreateReportDialog({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: CreateReportDialogProps) {
  const [draft, setDraft] = useState<ReportDraft>(emptyDraft);
  const { submit, fileProblem, periodProblem, message, isPending } = useCreateReport(
    projectId,
    (report) => {
      setDraft(emptyDraft());
      onCreated(report);
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New MIS report</DialogTitle>
          <DialogDescription>
            One report per month. A generated report draws its figures from the ledger; an uploaded
            one carries a PDF you supply now.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-mis-report"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit(draft);
          }}
        >
          <MisPeriodFields
            month={draft.month}
            year={draft.year}
            problem={periodProblem}
            onMonthChange={(month) => {
              setDraft({ ...draft, month });
            }}
            onYearChange={(year) => {
              setDraft({ ...draft, year });
            }}
          />

          <div className="space-y-2">
            <Label htmlFor="mis-title">Title</Label>
            <Input
              id="mis-title"
              required
              maxLength={160}
              value={draft.title}
              onChange={(event) => {
                setDraft({ ...draft, title: event.target.value });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Source</Label>
            <RadioGroup
              value={draft.source}
              className="flex gap-6"
              onValueChange={(next) => {
                setDraft({ ...draft, source: next === 'generated' ? 'generated' : 'uploaded' });
              }}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="mis-source-uploaded" value="uploaded" />
                <Label htmlFor="mis-source-uploaded">Uploaded PDF</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="mis-source-generated" value="generated" />
                <Label htmlFor="mis-source-generated">Generated</Label>
              </div>
            </RadioGroup>
          </div>

          {draft.source === 'uploaded' ? (
            <MisPdfField
              file={draft.file}
              problem={fileProblem}
              disabled={isPending}
              onChange={(file) => {
                setDraft({ ...draft, file });
              }}
            />
          ) : null}

          <MisNarrativeFields
            narrative={draft.narrative}
            outlook={draft.outlook}
            onNarrativeChange={(narrative) => {
              setDraft({ ...draft, narrative });
            }}
            onOutlookChange={(outlook) => {
              setDraft({ ...draft, outlook });
            }}
          />

          {message === null ? null : (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form="create-mis-report" disabled={isPending}>
            {isPending ? 'Creating…' : 'Create report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
