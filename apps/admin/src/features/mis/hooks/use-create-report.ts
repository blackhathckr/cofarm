import type { CreateMisBody, MisReport, MisSource } from '@cofarm/contracts/mis';
import { useState } from 'react';

import { ApiError } from '@/lib/api-client.ts';
import { useIdempotencyKey } from '@/lib/idempotency-key.ts';
import { useDocumentUpload } from '@/lib/document-upload.ts';
import { checkUpload, PDF_MIME } from '@/lib/upload-limits.ts';
import { useCreateMisReport } from './use-mis-mutations.ts';

export type ReportDraft = {
  month: number;
  year: number;
  title: string;
  source: MisSource;
  narrative: string;
  outlook: string;
  file: File | null;
};

function bodyOf(draft: ReportDraft, documentId: string | null): CreateMisBody {
  return {
    month: draft.month,
    year: draft.year,
    title: draft.title,
    source: draft.source,
    ...(draft.narrative === '' ? {} : { narrative: draft.narrative }),
    ...(draft.outlook === '' ? {} : { outlook: draft.outlook }),
    ...(documentId === null ? {} : { documentId }),
  };
}

export function useCreateReport(projectId: string, onCreated: (report: MisReport) => void) {
  const upload = useDocumentUpload();
  const create = useCreateMisReport(projectId);
  const nextKey = useIdempotencyKey();
  const [fileProblem, setFileProblem] = useState<string | null>(null);

  const submit = (draft: ReportDraft): void => {
    setFileProblem(null);
    const body = bodyOf(draft, null);

    if (draft.source === 'generated') {
      create.mutate(
        { body, idempotencyKey: nextKey(JSON.stringify(body)) },
        { onSuccess: onCreated },
      );
      return;
    }

    const file = draft.file;
    if (file === null) {
      setFileProblem('Attach the report PDF before creating an uploaded report.');
      return;
    }
    const checked = checkUpload(file, [PDF_MIME]);
    if ('rejection' in checked) {
      setFileProblem(checked.rejection);
      return;
    }

    void (async () => {
      const stored = await upload
        .mutateAsync({ projectId, type: 'mis_report', file, allowed: [PDF_MIME] })
        .catch(() => null);
      if (stored === null) return;
      const uploaded = bodyOf(draft, stored.id);
      create.mutate(
        { body: uploaded, idempotencyKey: nextKey(JSON.stringify(uploaded)) },
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
