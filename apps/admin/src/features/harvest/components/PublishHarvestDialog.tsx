import type { HarvestPreview } from '@cofarm/contracts/harvest';
import { useState } from 'react';

import { ErrorNote } from '@/components/ErrorNote';
import { MoneyText } from '@/components/MoneyText';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { usePublishHarvest } from '../hooks/use-publish-harvest.ts';

type PublishHarvestDialogProps = {
  preview: HarvestPreview;
};

const ALREADY_PUBLISHED =
  'This harvest is already published. Reload the page to see the published figures.';

export function PublishHarvestDialog({ preview }: PublishHarvestDialogProps) {
  const [open, setOpen] = useState(false);
  // One key per attempt: a retry after a timeout must not publish twice.
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  const publish = usePublishHarvest(preview.projectId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setIdempotencyKey(crypto.randomUUID());
          publish.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">Publish this harvest</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish and notify every partner</DialogTitle>
          <DialogDescription>
            Publishing is irreversible. It issues a statement to every partner on this project,
            notifies them, and appends the sale to the append-only ledger.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-2 rounded-lg border bg-muted p-4 text-sm">
          <dt className="text-muted-foreground">Net proceeds</dt>
          <dd className="font-semibold">
            <MoneyText paise={preview.netProceedsPaise} showPaise />
          </dd>
          <dt className="text-muted-foreground">Kiaan share</dt>
          <dd>
            <MoneyText paise={preview.kiaanSharePaise} showPaise />
          </dd>
          <dt className="text-muted-foreground">Partner pool</dt>
          <dd className="font-semibold">
            <MoneyText paise={preview.partnerPoolPaise} showPaise />
          </dd>
          <dt className="text-muted-foreground">Partners notified</dt>
          <dd>{preview.partners.length}</dd>
        </dl>

        <Alert variant="destructive">
          <AlertTitle>There is no unpublish</AlertTitle>
          <AlertDescription>
            A mistake after this point is corrected by appending further ledger entries, not by
            editing or withdrawing these statements.
          </AlertDescription>
        </Alert>

        <ErrorNote error={publish.error} conflict={ALREADY_PUBLISHED} />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={publish.isPending}
            onClick={() => {
              publish.mutate(
                { harvestId: preview.harvestId, idempotencyKey },
                {
                  onSuccess: () => {
                    setOpen(false);
                  },
                },
              );
            }}
          >
            {publish.isPending ? 'Publishing…' : 'Publish and notify'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
