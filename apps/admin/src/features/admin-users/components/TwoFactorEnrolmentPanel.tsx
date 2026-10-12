import type { TwoFactorEnrolment } from '@cofarm/contracts/admin-users';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TwoFactorEnrolmentPanelProps = {
  enrolment: TwoFactorEnrolment;
  code: string;
  isConfirming: boolean;
  onCodeChange: (code: string) => void;
  onConfirm: () => void;
};

export function TwoFactorEnrolmentPanel({
  enrolment,
  code,
  isConfirming,
  onCodeChange,
  onConfirm,
}: TwoFactorEnrolmentPanelProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Enrolment is not finished yet</AlertTitle>
        <AlertDescription>
          Two-factor stays off until you confirm a code below. A secret stored in your app without
          confirming it here will not let you in, so do not stop halfway.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="totp-secret">Secret</Label>
        <Input
          id="totp-secret"
          readOnly
          className="font-mono select-all"
          value={enrolment.secret}
        />
        <p className="text-xs text-muted-foreground">
          There is no QR code here. Paste either the secret or the setup URL below into your
          authenticator app.
        </p>
        <p className="rounded-md border bg-muted p-2 font-mono text-xs break-all select-all">
          {enrolment.otpauthUrl}
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="totp-confirm">Code from the app</Label>
          <Input
            id="totp-confirm"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="max-w-xs"
            value={code}
            onChange={(event) => {
              onCodeChange(event.target.value);
            }}
          />
        </div>
        <Button type="submit" disabled={code.length !== 6 || isConfirming}>
          {isConfirming ? 'Checking…' : 'Confirm enrolment'}
        </Button>
      </form>
    </div>
  );
}
