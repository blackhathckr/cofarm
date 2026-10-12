import type { MisComposePayload, MisReport } from '@cofarm/contracts/mis';
import { Send, Sparkles, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DownloadDocumentButton } from '@/components/DownloadDocumentButton';
import { EditReportDialog } from './EditReportDialog';
import { ApiError } from '@/lib/api-client.ts';
import { useIdempotencyKey } from '@/lib/idempotency-key.ts';
import {
  useComposeMisReport,
  useDeleteMisReport,
  usePublishMisReport,
  useUnpublishMisReport,
} from '../hooks/use-mis-mutations.ts';

type MisReportActionsProps = {
  projectId: string;
  report: MisReport;
  onComposed: (payload: MisComposePayload) => void;
  onDeleted: () => void;
};

function publishProblem(error: Error | null): string | null {
  if (error === null) return null;
  if (error instanceof ApiError && error.code === 'mis_document_missing') {
    return 'Attach a PDF first: a report cannot be published without its document.';
  }
  if (error instanceof ApiError && error.code === 'already_published') {
    return 'This report was already published. The page has been refreshed.';
  }
  return error.message;
}

export function MisReportActions({
  projectId,
  report,
  onComposed,
  onDeleted,
}: MisReportActionsProps) {
  const publish = usePublishMisReport(projectId, report.id);
  const compose = useComposeMisReport(projectId, report.id);
  const remove = useDeleteMisReport(projectId);
  const unpublish = useUnpublishMisReport(projectId, report.id);
  const nextKey = useIdempotencyKey();

  const problem = publishProblem(publish.error) ?? compose.error?.message ?? null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-3">
        <EditReportDialog projectId={projectId} report={report} />

        {report.documentId === null ? null : (
          <DownloadDocumentButton documentId={report.documentId} label="Download PDF" />
        )}

        {report.source === 'generated' ? (
          <Button
            type="button"
            variant="secondary"
            disabled={compose.isPending}
            onClick={() => {
              compose.mutate(undefined, { onSuccess: onComposed });
            }}
          >
            <Sparkles />
            {compose.isPending ? 'Composing…' : 'Compose figures'}
          </Button>
        ) : null}

        {report.status === 'draft' ? (
          <Button
            type="button"
            disabled={publish.isPending}
            onClick={() => {
              publish.mutate(nextKey(`publish:${report.id}`));
            }}
          >
            <Send />
            {publish.isPending ? 'Publishing…' : 'Publish'}
          </Button>
        ) : null}

        {report.status === 'published' ? (
          <Button
            type="button"
            variant="outline"
            disabled={unpublish.isPending}
            onClick={() => {
              unpublish.mutate(nextKey(`unpublish:${report.id}`));
            }}
          >
            <Undo2 />
            {unpublish.isPending ? 'Unpublishing…' : 'Unpublish'}
          </Button>
        ) : null}

        <Button
          type="button"
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => {
            remove.mutate(report.id, { onSuccess: onDeleted });
          }}
        >
          {remove.isPending ? 'Deleting…' : 'Delete'}
        </Button>
      </div>

      {problem === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
}
