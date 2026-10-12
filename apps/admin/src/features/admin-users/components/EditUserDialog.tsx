import type { AdminUser } from '@cofarm/contracts/admin-users';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fieldError, formError } from '../form-errors.ts';
import { useUpdateAdminUser } from '../hooks/use-admin-users.ts';

type EditUserDialogProps = {
  user: AdminUser;
  isOpen: boolean;
  onClose: () => void;
};

export function EditUserDialog({ user, isOpen, onClose }: EditUserDialogProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? '');
  const update = useUpdateAdminUser();

  const emailMessage = fieldError(update.error, 'email');
  const message = formError(update.error, ['email']);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Edit ${user.name}`}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            update.mutate(
              {
                userId: user.id,
                body: { name, ...(email === '' ? {} : { email }) },
              },
              {
                onSuccess: () => {
                  toast.success('Account updated');
                  onClose();
                },
              },
            );
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="edit-user-name">Name</Label>
            <Input
              id="edit-user-name"
              required
              minLength={2}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-user-email">Email</Label>
            <Input
              id="edit-user-email"
              type="email"
              aria-invalid={emailMessage !== null}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
            {emailMessage === null ? null : (
              <p className="text-sm text-destructive">{emailMessage}</p>
            )}
          </div>

          {message === null ? null : (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
