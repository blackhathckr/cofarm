import type { UpdateMisBody } from '@cofarm/contracts/mis';
import { useState } from 'react';

import { useDocumentUpload } from '@/lib/document-upload.ts';
import { checkUpload, SPREADSHEET_MIMES } from '@/lib/upload-limits.ts';
import { useUpdateMisReport } from './use-mis-mutations.ts';

export type ReportEdit = {
  title: string;
  /** A workbook to put in place of the attached one, if the admin picked one. */
  file: File | null;
};

export function useEditReport(projectId: string, reportId: string, onSaved: () => void) {
  const upload = useDocumentUpload();
  const update = useUpdateMisReport(projectId, reportId);
  const [fileProblem, setFileProblem] = useState<string | null>(null);

  const submit = (edit: ReportEdit): void => {
    setFileProblem(null);

    if (edit.file === null) {
      update.mutate({ title: edit.title }, { onSuccess: onSaved });
      return;
    }

    const checked = checkUpload(edit.file, SPREADSHEET_MIMES);
    if ('rejection' in checked) {
      setFileProblem(checked.rejection);
      return;
    }

    const file = edit.file;
    void (async () => {
      const stored = await upload
        .mutateAsync({ projectId, type: 'mis_report', file, allowed: SPREADSHEET_MIMES })
        .catch(() => null);
      if (stored === null) return;
      const body: UpdateMisBody = { title: edit.title, documentId: stored.id };
      update.mutate(body, { onSuccess: onSaved });
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
