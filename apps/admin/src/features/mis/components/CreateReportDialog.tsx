import { misPeriodOf, previousMisPeriod, type MisReport } from '@cofarm/contracts/mis';
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
import { useCreateReport, type ReportDraft } from '../hooks/use-create-report.ts';
import { MisFileField } from './MisFileField';
import { MisPeriodFields } from './MisPeriodFields';

type CreateReportDialogProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (report: MisReport) => void;
};

/** Starts on the quarter just closed, which is the one usually being reported. */
function emptyDraft(): ReportDraft {
  const now = new Date();
  const period = previousMisPeriod(misPeriodOf(now.getFullYear(), now.getMonth() + 1));
  return { quarter: period.quarter, year: period.year, title: '', file: null };
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
            One report per quarter. Partners open the workbook on their phone once it is published.
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
            quarter={draft.quarter}
            year={draft.year}
            problem={periodProblem}
            onQuarterChange={(quarter) => {
              setDraft({ ...draft, quarter });
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

          <MisFileField
            file={draft.file}
            problem={fileProblem}
            disabled={isPending}
            emptyHint="The quarter's MIS as an Excel file."
            onChange={(file) => {
              setDraft({ ...draft, file });
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
