import type { SignatureStatus } from '@cofarm/contracts/signatures';
import { useState } from 'react';
import { toast } from 'sonner';

import { LoadMore } from '@/components/LoadMore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-client.ts';
import { IssueDocumentDialog } from '../components/IssueDocumentDialog';
import { PendingSignatureTable } from '../components/PendingSignatureTable';
import { SettledSignatureTable } from '../components/SettledSignatureTable';
import { SignatureFilters } from '../components/SignatureFilters';
import { useDocumentDownload } from '@/lib/document-download.ts';
import {
  useCancelSignature,
  useRemindAllSignatures,
  useRemindSignature,
} from '../hooks/use-signature-actions.ts';
import { useSignatures } from '../hooks/use-signatures.ts';

export function ApprovalsPage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [status, setStatus] = useState<SignatureStatus | null>(null);

  const signatures = useSignatures({
    ...(projectId === null ? {} : { projectId }),
    ...(status === null ? {} : { status }),
  });
  const download = useDocumentDownload();
  const remind = useRemindSignature();
  const cancel = useCancelSignature();
  const remindAll = useRemindAllSignatures();

  const requests = signatures.items;
  const pending = requests.filter((signature) => signature.status === 'pending');
  const settled = requests.filter((signature) => signature.status !== 'pending');
  const busyRequestId =
    (remind.isPending ? remind.variables : null) ??
    (cancel.isPending ? cancel.variables : null) ??
    null;

  function sendReminder(requestId: string) {
    remind.mutate(requestId, {
      onSuccess: () => {
        toast.success('Reminder sent');
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'signature_already_settled') {
          toast.info('That request was already signed or cancelled. The list has been refreshed.');
          return;
        }
        toast.error(error.message);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
          <p className="text-sm text-muted-foreground">
            Documents issued for a partner&apos;s acknowledgement, and what has come back.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={projectId === null || remindAll.isPending}
            onClick={() => {
              if (projectId === null) return;
              remindAll.mutate(projectId, {
                onSuccess: (outcome) => {
                  toast.success(`Reminded ${String(outcome.reminded)} partner(s)`);
                },
                onError: (error) => {
                  toast.error(error.message);
                },
              });
            }}
          >
            {remindAll.isPending ? 'Reminding…' : 'Remind all unread'}
          </Button>
          <IssueDocumentDialog />
        </div>
      </div>

      <SignatureFilters
        projectId={projectId}
        status={status}
        onProjectChange={setProjectId}
        onStatusChange={setStatus}
      />

      {projectId === null ? (
        <p className="text-xs text-muted-foreground">
          Choose a project to enable reminding every partner who has not signed yet.
        </p>
      ) : null}

      {signatures.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Pending signatures</h2>
            <div className="rounded-lg border bg-card">
              <PendingSignatureTable
                requests={pending}
                busyRequestId={busyRequestId}
                onView={(documentId) => {
                  download.mutate(documentId);
                }}
                onRemind={sendReminder}
                onCancel={(requestId) => {
                  cancel.mutate(requestId);
                }}
              />
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Signed</h2>
            <p className="text-sm text-muted-foreground">
              Cancelled and declined requests are listed here too.
            </p>
            <div className="rounded-lg border bg-card">
              <SettledSignatureTable
                requests={settled}
                onView={(documentId) => {
                  download.mutate(documentId);
                }}
              />
            </div>
          </section>

          <LoadMore paging={signatures} label="Load more requests" />
        </div>
      )}
    </div>
  );
}
