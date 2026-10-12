import type { Role } from '@cofarm/contracts/admin-users';
import type { Permission } from '@cofarm/contracts/permissions';
import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { fieldError, formError } from '../form-errors.ts';
import { useCreateRole, usePermissionCatalogue, useUpdateRole } from '../hooks/use-roles.ts';
import { PermissionGroupPicker } from './PermissionGroupPicker';

type RoleEditorDialogProps = {
  role: Role | null;
  isOpen: boolean;
  onClose: () => void;
};

export function RoleEditorDialog({ role, isOpen, onClose }: RoleEditorDialogProps) {
  const [name, setName] = useState(role?.name ?? '');
  const [key, setKey] = useState(role?.key ?? '');
  const [permissions, setPermissions] = useState<Permission[]>(role?.permissions ?? []);

  const catalogue = usePermissionCatalogue();
  const create = useCreateRole();
  const update = useUpdateRole();

  const isReadOnly = role?.isSystem === true;
  const action = role === null ? create : update;
  const keyMessage = fieldError(action.error, 'key');
  const message = formError(action.error, ['key']);

  function save() {
    if (role === null) {
      create.mutate({ key, name, permissions }, { onSuccess: finish });
      return;
    }
    update.mutate({ roleId: role.id, body: { name, permissions } }, { onSuccess: finish });
  }

  function finish() {
    toast.success(role === null ? 'Role created' : 'Role updated');
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{role === null ? 'New role' : role.name}</DialogTitle>
          <DialogDescription>
            Permissions are grouped by the area of the console they unlock.
          </DialogDescription>
        </DialogHeader>

        {isReadOnly ? (
          <Alert>
            <AlertTitle>Built-in role</AlertTitle>
            <AlertDescription>
              Built-in roles cannot be changed or deleted, so this is a read-only view. Create a
              role of your own with the permissions you need.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              disabled={isReadOnly}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-key">Key</Label>
            <Input
              id="role-key"
              disabled={isReadOnly || role !== null}
              placeholder="finance-viewer"
              aria-invalid={keyMessage !== null}
              value={key}
              onChange={(event) => {
                setKey(event.target.value);
              }}
            />
            {keyMessage === null ? (
              <p className="text-xs text-muted-foreground">Kebab-case, fixed once created.</p>
            ) : (
              <p className="text-sm text-destructive">{keyMessage}</p>
            )}
          </div>
        </div>

        <PermissionGroupPicker
          groups={catalogue.data ?? []}
          selected={permissions}
          isReadOnly={isReadOnly}
          onChange={setPermissions}
        />

        {message === null ? null : (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isReadOnly ? 'Close' : 'Cancel'}
          </Button>
          {isReadOnly ? null : (
            <Button disabled={name === '' || key === '' || action.isPending} onClick={save}>
              {action.isPending ? 'Saving…' : 'Save role'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
