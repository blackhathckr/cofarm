import type { MisReport } from '@cofarm/contracts/mis';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
import { useEditReport, type ReportEdit } from '../hooks/use-edit-report.ts';
import { MisFileField } from './MisFileField';

type EditReportDialogProps = {
  projectId: string;
  report: MisReport;
};

function draftOf(report: MisReport): ReportEdit {
  return { title: report.title, file: null };
}

export function EditReportDialog({ projectId, report }: EditReportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(() => draftOf(report));
  const edit = useEditReport(projectId, report.id, () => {
    toast.success('Draft saved');
    setIsOpen(false);
  });

  function patch(next: Partial<ReportEdit>): void {
    setDraft((current) => ({ ...current, ...next }));
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setDraft(draftOf(report));
        else edit.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil />
          Edit draft
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{`Edit ${report.label}`}</DialogTitle>
          <DialogDescription>
            Only a draft can be edited. Once published, the report is the record a partner was
            shown.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            edit.submit(draft);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="mis-title">Title</Label>
            <Input
              id="mis-title"
              required
              minLength={2}
              value={draft.title}
              onChange={(event) => {
                patch({ title: event.target.value });
              }}
            />
          </div>

          <MisFileField
            file={draft.file}
            problem={edit.fileProblem}
            disabled={edit.isPending}
            emptyHint="Pick a file only to replace the attached one."
            onChange={(file) => {
              patch({ file });
            }}
          />

          {edit.message === null ? null : (
            <p role="alert" className="text-sm font-medium text-destructive">
              {edit.message}
            </p>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={edit.isPending}>
              {edit.isPending ? 'Saving…' : 'Save draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
