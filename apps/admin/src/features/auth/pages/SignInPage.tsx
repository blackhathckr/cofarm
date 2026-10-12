import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client.ts';
import { useSignIn } from '../hooks/use-sign-in.ts';

export function SignInPage() {
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');

  const needsTotp = signIn.error instanceof ApiError && signIn.error.code === 'two_factor_required';
  const message = signIn.error instanceof ApiError ? signIn.error.message : null;

  return (
    <div className="grid min-h-dvh place-items-center bg-sand-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.14em] text-clay-600 uppercase">CoFarm</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Console</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your Kiaan admin account.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            signIn.mutate({ email, password, ...(totp === '' ? {} : { totp }) });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
          </div>

          {needsTotp ? (
            <div className="space-y-2">
              <Label htmlFor="totp">Authenticator code</Label>
              <Input
                id="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={totp}
                onChange={(event) => {
                  setTotp(event.target.value);
                }}
              />
            </div>
          ) : null}

          {message !== null ? (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={signIn.isPending}>
            {signIn.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
