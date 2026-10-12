import type { Role } from '@cofarm/contracts/admin-users';
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
import { useDeleteRole } from '../hooks/use-roles.ts';

type DeleteRoleDialogProps = {
  role: Role;
  isOpen: boolean;
  onClose: () => void;
};

export function DeleteRoleDialog({ role, isOpen, onClose }: DeleteRoleDialogProps) {
  const remove = useDeleteRole();
  const message = formError(remove.error);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Delete the ${role.name} role?`}</DialogTitle>
          <DialogDescription>
            Nobody holds it, so no account loses access. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {message === null ? null : (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep role
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => {
              remove.mutate(role.id, {
                onSuccess: () => {
                  toast.success(`${role.name} deleted`);
                  onClose();
                },
              });
            }}
          >
            {remove.isPending ? 'Deleting…' : 'Delete role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
