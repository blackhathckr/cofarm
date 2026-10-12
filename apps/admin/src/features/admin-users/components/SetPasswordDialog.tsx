import type { AdminUser } from '@cofarm/contracts/admin-users';
import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formError } from '../form-errors.ts';
import { useSetAdminUserPassword } from '../hooks/use-admin-users.ts';

type SetPasswordDialogProps = {
  user: AdminUser;
  isOpen: boolean;
  onClose: () => void;
};

export function SetPasswordDialog({ user, isOpen, onClose }: SetPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const setUserPassword = useSetAdminUserPassword();
  const message = formError(setUserPassword.error);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Set a password for ${user.name}`}</DialogTitle>
          <DialogDescription>
            Their existing sessions keep working until they sign out.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setUserPassword.mutate(
              { userId: user.id, body: { password } },
              {
                onSuccess: () => {
                  toast.success('Password set');
                  setPassword('');
                  onClose();
                },
              },
            );
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="set-password">New password</Label>
            <Input
              id="set-password"
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

          {message === null ? null : (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={setUserPassword.isPending}>
              {setUserPassword.isPending ? 'Saving…' : 'Set password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
