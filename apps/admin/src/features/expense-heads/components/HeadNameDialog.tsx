import { useState, type SyntheticEvent } from 'react';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type HeadNameDialogProps = {
  title: string;
  description: string;
  initialName: string;
  submitLabel: string;
  isPending: boolean;
  error: unknown;
  onSubmit: (name: string) => void;
  onClose: () => void;
};

export function HeadNameDialog({
  title,
  description,
  initialName,
  submitLabel,
  isPending,
  error,
  onSubmit,
  onClose,
}: HeadNameDialogProps) {
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (trimmed.length >= 2) onSubmit(trimmed);
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1">
            <Label htmlFor="head-name">Name</Label>
            <Input
              id="head-name"
              autoFocus
              maxLength={80}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </div>

          <ErrorNote error={error} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || trimmed.length < 2}>
              {isPending ? 'Saving…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
