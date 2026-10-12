import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ErrorNote } from '@/components/ErrorNote';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDocumentDelete } from '@/lib/document-delete.ts';

type DeleteDocumentButtonProps = {
  documentId: string;
  name: string;
};

const STILL_REFERENCED =
  'This file is attached to an MIS report, a ledger entry, a signature request or a harvest. Detach it there before deleting it.';

export function DeleteDocumentButton({ documentId, name }: DeleteDocumentButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const remove = useDocumentDelete();

  function close(): void {
    setIsConfirming(false);
    remove.reset();
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive"
        onClick={() => {
          setIsConfirming(true);
        }}
      >
        <Trash2 />
        Delete
      </Button>

      <Dialog
        open={isConfirming}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this document?</DialogTitle>
            <DialogDescription>
              {`${name} is removed from storage as well as from the record, and cannot be recovered.`}
            </DialogDescription>
          </DialogHeader>

          <ErrorNote error={remove.error} conflict={STILL_REFERENCED} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => {
                remove.mutate(documentId, { onSuccess: close });
              }}
            >
              {remove.isPending ? 'Deleting…' : 'Delete document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
