import type { AdminUser } from '@cofarm/contracts/admin-users';
import { SYSTEM_ROLES } from '@cofarm/contracts/permissions';
import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formError } from '../form-errors.ts';
import { useSetAdminUserRoles } from '../hooks/use-admin-users.ts';
import { useRoles } from '../hooks/use-roles.ts';
import { LAST_SUPERADMIN_REASON } from '../superadmin-guard.ts';

type UserRolesDialogProps = {
  user: AdminUser;
  isLastSuperadmin: boolean;
  isOpen: boolean;
  onClose: () => void;
};

export function UserRolesDialog({ user, isLastSuperadmin, isOpen, onClose }: UserRolesDialogProps) {
  const [roleKeys, setRoleKeys] = useState<string[]>(user.roleKeys);
  const roles = useRoles();
  const assign = useSetAdminUserRoles();
  const message = formError(assign.error);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Roles for ${user.name}`}</DialogTitle>
        </DialogHeader>

        {isLastSuperadmin ? (
          <Alert>
            <AlertTitle>Superadmin stays assigned</AlertTitle>
            <AlertDescription>{LAST_SUPERADMIN_REASON}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          {(roles.data ?? []).map((role) => {
            const isPinned = isLastSuperadmin && role.key === SYSTEM_ROLES.superadmin;

            return (
              <label key={role.id} className="flex items-start gap-2 text-sm">
                <Checkbox
                  disabled={isPinned}
                  checked={roleKeys.includes(role.key)}
                  onCheckedChange={(checked) => {
                    setRoleKeys((current) =>
                      checked === true
                        ? [...current, role.key]
                        : current.filter((key) => key !== role.key),
                    );
                  }}
                />
                <span>
                  <span className="font-medium">{role.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {`${role.key} · ${String(role.permissions.length)} permissions`}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {message === null ? null : (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={assign.isPending}
            onClick={() => {
              assign.mutate(
                { userId: user.id, body: { roleKeys } },
                {
                  onSuccess: () => {
                    toast.success('Roles updated');
                    onClose();
                  },
                },
              );
            }}
          >
            {assign.isPending ? 'Saving…' : 'Save roles'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
