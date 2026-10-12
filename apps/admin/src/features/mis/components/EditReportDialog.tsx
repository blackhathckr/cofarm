import type { MisReport } from '@cofarm/contracts/mis';
import { Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DownloadDocumentButton } from '@/components/DownloadDocumentButton';
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
import { useEditReport, type ReportEdit } from '../hooks/use-edit-report.ts';
import { MisPdfField } from './MisPdfField';

type EditReportDialogProps = {
  projectId: string;
  report: MisReport;
};

function draftOf(report: MisReport): ReportEdit {
  return {
    title: report.title,
    narrative: report.narrative ?? '',
    outlook: report.outlook ?? '',
    file: null,
    removePdf: false,
  };
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

      <DialogContent className="sm:max-w-2xl">
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

          <div className="space-y-2">
            <Label htmlFor="mis-narrative">Narrative</Label>
            <Textarea
              id="mis-narrative"
              rows={5}
              maxLength={8000}
              value={draft.narrative}
              onChange={(event) => {
                patch({ narrative: event.target.value });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mis-outlook">Outlook</Label>
            <Textarea
              id="mis-outlook"
              rows={3}
              maxLength={8000}
              value={draft.outlook}
              onChange={(event) => {
                patch({ outlook: event.target.value });
              }}
            />
          </div>

          {report.documentId === null || draft.removePdf ? null : (
            <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 p-3">
              <span className="text-sm font-medium">PDF attached</span>
              <DownloadDocumentButton documentId={report.documentId} label="Download" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={edit.isPending}
                onClick={() => {
                  patch({ removePdf: true, file: null });
                }}
              >
                <X />
                Remove
              </Button>
            </div>
          )}

          <MisPdfField
            file={draft.file}
            problem={edit.fileProblem}
            disabled={edit.isPending}
            onChange={(file) => {
              patch({ file, removePdf: false });
            }}
          />
          {report.documentId !== null && !draft.removePdf && draft.file === null ? (
            <p className="text-xs text-muted-foreground">
              Pick a file only to replace the one above.
            </p>
          ) : null}

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
