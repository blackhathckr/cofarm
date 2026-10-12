import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentUrl } from '@/lib/document-download.ts';

type ImageViewerDialogProps = {
  documentIds: readonly string[];
  /** Null while the viewer is closed. */
  openDocumentId: string | null;
  label: string;
  onClose: () => void;
};

function Frame({ documentId, alt }: { documentId: string; alt: string }) {
  const ticket = useDocumentUrl(documentId);

  if (ticket.isError) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        That image could not be loaded.
      </p>
    );
  }

  if (ticket.data === undefined) return <Skeleton className="viewer-frame-pending w-full" />;

  return (
    <img
      src={ticket.data.downloadUrl}
      alt={alt}
      className="viewer-frame w-auto max-w-full object-contain"
    />
  );
}

export function ImageViewerDialog({
  documentIds,
  openDocumentId,
  label,
  onClose,
}: ImageViewerDialogProps) {
  const [shownId, setShownId] = useState(openDocumentId);

  useEffect(() => {
    setShownId(openDocumentId);
  }, [openDocumentId]);

  const index = shownId === null ? -1 : documentIds.indexOf(shownId);
  const total = documentIds.length;

  const step = (by: number): void => {
    if (index < 0 || total === 0) return;
    const next = documentIds[(index + by + total) % total];
    if (next !== undefined) setShownId(next);
  };

  return (
    <Dialog
      open={shownId !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        className="viewer-dialog"
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') step(-1);
          if (event.key === 'ArrowRight') step(1);
        }}
      >
        <DialogTitle className="text-base">{label}</DialogTitle>
        <DialogDescription className="sr-only">
          Use the arrow keys or the buttons to move between images.
        </DialogDescription>

        <div className="flex items-center justify-center">
          {shownId === null ? null : (
            <Frame documentId={shownId} alt={`${label}, ${(index + 1).toString()} of ${total}`} />
          )}
        </div>

        {total < 2 ? null : (
          <div className="flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Previous image"
              onClick={() => {
                step(-1);
              }}
            >
              <ChevronLeft />
            </Button>
            <span className="tabular text-xs text-muted-foreground">
              {`${(index + 1).toString()} / ${total.toString()}`}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Next image"
              onClick={() => {
                step(1);
              }}
            >
              <ChevronRight />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
