import type { ProjectUpdate } from '@cofarm/contracts/updates';
import { Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useIdempotencyKey } from '@/lib/idempotency-key.ts';
import { useDeleteUpdate, useUnpublishUpdate } from '../hooks/use-update-mutations.ts';
import { useUpdate } from '../hooks/use-updates.ts';
import { UpdateComposeForm } from './UpdateComposeForm';

type EditUpdateDialogProps = {
  projectId: string;
  updateId: string | null;
  onClose: () => void;
};

type EditUpdateBodyProps = {
  projectId: string;
  update: ProjectUpdate;
  onClose: () => void;
};

function EditUpdateBody({ projectId, update, onClose }: EditUpdateBodyProps) {
  const remove = useDeleteUpdate(projectId);
  const unpublish = useUnpublishUpdate(projectId, update.id);
  const nextKey = useIdempotencyKey();

  return (
    <div className="space-y-6">
      <UpdateComposeForm projectId={projectId} update={update} onSaved={onClose} />

      <div className="flex flex-wrap items-center gap-3">
        {update.status === 'published' ? (
          <Button
            type="button"
            variant="outline"
            disabled={unpublish.isPending}
            onClick={() => {
              unpublish.mutate(nextKey(`unpublish:${update.id}`));
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
            remove.mutate(update.id, { onSuccess: onClose });
          }}
        >
          {remove.isPending ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </div>
  );
}

export function EditUpdateDialog({ projectId, updateId, onClose }: EditUpdateDialogProps) {
  const update = useUpdate(projectId, updateId);
  const isPublished = update.data?.status === 'published';

  return (
    <Dialog
      open={updateId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isPublished ? 'Published update' : 'Draft update'}</DialogTitle>
          <DialogDescription>
            {isPublished
              ? 'Partners can already see this update, so an edit reaches them at once.'
              : 'Nothing reaches partners until this draft is published.'}
          </DialogDescription>
        </DialogHeader>

        {update.data === undefined ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <EditUpdateBody projectId={projectId} update={update.data} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
