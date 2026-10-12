import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formError } from '../form-errors.ts';
import { useChangeOwnPassword } from '../hooks/use-own-security.ts';

export function OwnPasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const change = useChangeOwnPassword();
  const message = formError(change.error);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>At least 12 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            change.mutate(
              { currentPassword, newPassword },
              {
                onSuccess: () => {
                  toast.success('Password changed');
                  setCurrentPassword('');
                  setNewPassword('');
                },
              },
            );
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="own-current-password">Current password</Label>
            <Input
              id="own-current-password"
              type="password"
              required
              autoComplete="current-password"
              className="max-w-sm"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="own-new-password">New password</Label>
            <Input
              id="own-new-password"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              className="max-w-sm"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
              }}
            />
          </div>

          {message === null ? null : (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}

          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? 'Saving…' : 'Change password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
