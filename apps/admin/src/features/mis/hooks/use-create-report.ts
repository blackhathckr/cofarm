import type { CreateMisBody, MisReport } from '@cofarm/contracts/mis';
import { useState } from 'react';

import { ApiError } from '@/lib/api-client.ts';
import { useIdempotencyKey } from '@/lib/idempotency-key.ts';
import { useDocumentUpload } from '@/lib/document-upload.ts';
import { checkUpload, SPREADSHEET_MIMES } from '@/lib/upload-limits.ts';
import { useCreateMisReport } from './use-mis-mutations.ts';

export type ReportDraft = {
  quarter: number;
  year: number;
  title: string;
  file: File | null;
};

export function useCreateReport(projectId: string, onCreated: (report: MisReport) => void) {
  const upload = useDocumentUpload();
  const create = useCreateMisReport(projectId);
  const nextKey = useIdempotencyKey();
  const [fileProblem, setFileProblem] = useState<string | null>(null);

  const submit = (draft: ReportDraft): void => {
    setFileProblem(null);

    const file = draft.file;
    if (file === null) {
      setFileProblem('Attach the MIS workbook.');
      return;
    }
    const checked = checkUpload(file, SPREADSHEET_MIMES);
    if ('rejection' in checked) {
      setFileProblem(checked.rejection);
      return;
    }

    void (async () => {
      const stored = await upload
        .mutateAsync({ projectId, type: 'mis_report', file, allowed: SPREADSHEET_MIMES })
        .catch(() => null);
      if (stored === null) return;
      const body: CreateMisBody = {
        quarter: draft.quarter,
        year: draft.year,
        title: draft.title,
        documentId: stored.id,
      };
      create.mutate(
        { body, idempotencyKey: nextKey(JSON.stringify(body)) },
        { onSuccess: onCreated },
      );
    })();
  };

  const periodProblem =
    create.error instanceof ApiError && create.error.code === 'mis_period_exists'
      ? create.error.message
      : null;

  return {
    submit,
    fileProblem,
    periodProblem,
    isPending: upload.isPending || create.isPending,
    message:
      periodProblem !== null ? null : (create.error?.message ?? upload.error?.message ?? null),
  };
}
