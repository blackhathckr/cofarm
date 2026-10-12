import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formError } from '../form-errors.ts';
import {
  useConfirmTwoFactor,
  useDisableTwoFactor,
  useEnrolTwoFactor,
} from '../hooks/use-own-security.ts';
import { TwoFactorEnrolmentPanel } from './TwoFactorEnrolmentPanel';
import { TwoFactorDisableForm } from './TwoFactorDisableForm';

export function TwoFactorCard() {
  const [code, setCode] = useState('');

  const enrol = useEnrolTwoFactor();
  const confirm = useConfirmTwoFactor();
  const disable = useDisableTwoFactor();

  const enrolment = confirm.isSuccess ? undefined : enrol.data;
  const message = formError(enrol.error) ?? formError(confirm.error);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>
          An authenticator code on top of your password, asked for at sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {confirm.isSuccess ? (
          <Alert>
            <AlertTitle>Two-factor is on</AlertTitle>
            <AlertDescription>
              Your next sign-in will ask for a code from your authenticator app.
            </AlertDescription>
          </Alert>
        ) : null}

        {enrolment === undefined ? (
          <Button
            disabled={enrol.isPending}
            onClick={() => {
              enrol.mutate();
            }}
          >
            {enrol.isPending ? 'Preparing…' : 'Set up an authenticator'}
          </Button>
        ) : (
          <TwoFactorEnrolmentPanel
            enrolment={enrolment}
            code={code}
            isConfirming={confirm.isPending}
            onCodeChange={setCode}
            onConfirm={() => {
              confirm.mutate(
                { code },
                {
                  onSuccess: () => {
                    toast.success('Two-factor enabled');
                    setCode('');
                  },
                },
              );
            }}
          />
        )}

        {message === null ? null : (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}

        <Separator />

        <TwoFactorDisableForm
          isPending={disable.isPending}
          error={formError(disable.error)}
          onDisable={(body, reset) => {
            disable.mutate(body, {
              onSuccess: () => {
                toast.success('Two-factor turned off');
                reset();
              },
            });
          }}
        />
      </CardContent>
    </Card>
  );
}
