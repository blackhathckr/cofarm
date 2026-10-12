import type { AdminUser } from '@cofarm/contracts/admin-users';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formError } from '../form-errors.ts';
import { useDeleteAdminUser } from '../hooks/use-admin-users.ts';

type DeleteUserDialogProps = {
  user: AdminUser;
  isOpen: boolean;
  onClose: () => void;
};

export function DeleteUserDialog({ user, isOpen, onClose }: DeleteUserDialogProps) {
  const remove = useDeleteAdminUser();
  const message = formError(remove.error);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Delete ${user.name}?`}</DialogTitle>
          <DialogDescription>
            The account is marked deleted and can no longer sign in. Audit history is kept.
          </DialogDescription>
        </DialogHeader>

        {message === null ? null : (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep account
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => {
              remove.mutate(user.id, {
                onSuccess: () => {
                  toast.success(`${user.name} deleted`);
                  onClose();
                },
              });
            }}
          >
            {remove.isPending ? 'Deleting…' : 'Delete account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
