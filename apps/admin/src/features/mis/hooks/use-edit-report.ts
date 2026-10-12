import type { UpdateMisBody } from '@cofarm/contracts/mis';
import { useState } from 'react';

import { useDocumentUpload } from '@/lib/document-upload.ts';
import { checkUpload, PDF_MIME } from '@/lib/upload-limits.ts';
import { useUpdateMisReport } from './use-mis-mutations.ts';

export type ReportEdit = {
  title: string;
  narrative: string;
  outlook: string;
  /** A new PDF to put in place of the attached one, if the admin picked one. */
  file: File | null;
  /** Detaches the PDF already on the report. */
  removePdf: boolean;
};

/** A picked file wins; otherwise an explicit removal detaches what is there. */
function attachment(edit: ReportEdit, documentId: string | null): { documentId?: string | null } {
  if (documentId !== null) return { documentId };
  return edit.removePdf ? { documentId: null } : {};
}

function bodyOf(edit: ReportEdit, documentId: string | null): UpdateMisBody {
  return {
    title: edit.title,
    narrative: edit.narrative === '' ? null : edit.narrative,
    outlook: edit.outlook === '' ? null : edit.outlook,
    ...attachment(edit, documentId),
  };
}

export function useEditReport(projectId: string, reportId: string, onSaved: () => void) {
  const upload = useDocumentUpload();
  const update = useUpdateMisReport(projectId, reportId);
  const [fileProblem, setFileProblem] = useState<string | null>(null);

  const submit = (edit: ReportEdit): void => {
    setFileProblem(null);

    if (edit.file === null) {
      update.mutate(bodyOf(edit, null), { onSuccess: onSaved });
      return;
    }

    const checked = checkUpload(edit.file, [PDF_MIME]);
    if ('rejection' in checked) {
      setFileProblem(checked.rejection);
      return;
    }

    const file = edit.file;
    void (async () => {
      const stored = await upload
        .mutateAsync({ projectId, type: 'mis_report', file, allowed: [PDF_MIME] })
        .catch(() => null);
      if (stored === null) return;
      update.mutate(bodyOf(edit, stored.id), { onSuccess: onSaved });
    })();
  };

  return {
    submit,
    fileProblem,
    isPending: upload.isPending || update.isPending,
    message: update.error?.message ?? upload.error?.message ?? null,
    reset: () => {
      setFileProblem(null);
      update.reset();
      upload.reset();
    },
  };
}
