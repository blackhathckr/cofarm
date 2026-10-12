import type { DisableTwoFactorBody } from '@cofarm/contracts/admin-users';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TwoFactorDisableFormProps = {
  isPending: boolean;
  error: string | null;
  onDisable: (body: DisableTwoFactorBody, reset: () => void) => void;
};

export function TwoFactorDisableForm({ isPending, error, onDisable }: TwoFactorDisableFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [code, setCode] = useState('');

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onDisable({ currentPassword, code }, () => {
          setCurrentPassword('');
          setCode('');
        });
      }}
    >
      <div>
        <p className="text-sm font-medium">Turn two-factor off</p>
        <p className="text-xs text-muted-foreground">
          Both your password and a current code are required.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-2">
          <Label htmlFor="totp-disable-password">Password</Label>
          <Input
            id="totp-disable-password"
            type="password"
            autoComplete="current-password"
            className="max-w-xs"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="totp-disable-code">Code</Label>
          <Input
            id="totp-disable-code"
            inputMode="numeric"
            maxLength={6}
            className="max-w-xs"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
            }}
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={currentPassword === '' || code.length !== 6 || isPending}
        >
          {isPending ? 'Turning off…' : 'Turn off'}
        </Button>
      </div>

      {error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
