import type { AdminUser } from '@cofarm/contracts/admin-users';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUpdateAdminUser } from '../hooks/use-admin-users.ts';
import { LAST_SUPERADMIN_REASON } from '../superadmin-guard.ts';
import { DeleteUserDialog } from './DeleteUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { SetPasswordDialog } from './SetPasswordDialog';
import { UserRolesDialog } from './UserRolesDialog';

type OpenDialog = 'edit' | 'roles' | 'password' | 'delete' | null;

type UserRowActionsProps = {
  user: AdminUser;
  isLastSuperadmin: boolean;
};

export function UserRowActions({ user, isLastSuperadmin }: UserRowActionsProps) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const update = useUpdateAdminUser();

  const isActive = user.status === 'active';
  const close = () => {
    setOpenDialog(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setOpenDialog('edit');
            }}
          >
            Edit details
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setOpenDialog('roles');
            }}
          >
            Assign roles
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setOpenDialog('password');
            }}
          >
            Set password
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            disabled={(isActive && isLastSuperadmin) || update.isPending}
            onSelect={() => {
              update.mutate(
                { userId: user.id, body: { status: isActive ? 'suspended' : 'active' } },
                {
                  onSuccess: () => {
                    toast.success(isActive ? 'Account suspended' : 'Account reactivated');
                  },
                  onError: (error) => {
                    toast.error(error.message);
                  },
                },
              );
            }}
          >
            {isActive ? 'Suspend' : 'Reactivate'}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={isLastSuperadmin}
            onSelect={() => {
              setOpenDialog('delete');
            }}
          >
            Delete
          </DropdownMenuItem>

          {isLastSuperadmin ? (
            <DropdownMenuLabel className="max-w-xs text-xs font-normal whitespace-normal text-muted-foreground">
              {LAST_SUPERADMIN_REASON}
            </DropdownMenuLabel>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {openDialog === 'edit' ? <EditUserDialog user={user} isOpen onClose={close} /> : null}
      {openDialog === 'roles' ? (
        <UserRolesDialog user={user} isLastSuperadmin={isLastSuperadmin} isOpen onClose={close} />
      ) : null}
      {openDialog === 'password' ? <SetPasswordDialog user={user} isOpen onClose={close} /> : null}
      {openDialog === 'delete' ? <DeleteUserDialog user={user} isOpen onClose={close} /> : null}
    </>
  );
}
