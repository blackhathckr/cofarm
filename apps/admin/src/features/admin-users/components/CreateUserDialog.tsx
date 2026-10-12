import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useCreateAdminUser } from '../hooks/use-admin-users.ts';
import { useRoles } from '../hooks/use-roles.ts';

type CreateUserDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CreateUserDialog({ isOpen, onClose }: CreateUserDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleKeys, setRoleKeys] = useState<string[]>([]);

  const roles = useRoles();
  const create = useCreateAdminUser();

  const emailMessage = fieldError(create.error, 'email');
  const message = formError(create.error, ['email']);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New admin account</DialogTitle>
          <DialogDescription>At least one role is required.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate(
              { name, email, password, roleKeys },
              {
                onSuccess: (created) => {
                  toast.success(`${created.name} can now sign in`);
                  onClose();
                },
              },
            );
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="new-user-name">Name</Label>
            <Input
              id="new-user-name"
              required
              minLength={2}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-user-email">Email</Label>
            <Input
              id="new-user-email"
              type="email"
              required
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

          <div className="space-y-2">
            <Label htmlFor="new-user-password">Password</Label>
            <Input
              id="new-user-password"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground">At least 12 characters.</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Roles</legend>
            {(roles.data ?? []).map((role) => (
              <label key={role.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={roleKeys.includes(role.key)}
                  onCheckedChange={(checked) => {
                    setRoleKeys((current) =>
                      checked === true
                        ? [...current, role.key]
                        : current.filter((key) => key !== role.key),
                    );
                  }}
                />
                {role.name}
              </label>
            ))}
          </fieldset>

          {message === null ? null : (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={roleKeys.length === 0 || create.isPending}>
              {create.isPending ? 'Creating…' : 'Create account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
