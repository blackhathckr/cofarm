import { Outlet } from '@tanstack/react-router';

import { AppShell } from '@/components/AppShell';
import { Toaster } from '@/components/ui/sonner';
import { useRestoreSession, useSession } from '@/features/auth/hooks/use-session.ts';
import { useSignOut } from '@/features/auth/hooks/use-sign-out.ts';
import { SignInPage } from '@/features/auth/pages/SignInPage';

export function RootLayout() {
  const session = useSession();
  const { isRestoring } = useRestoreSession();
  const signOut = useSignOut();

  if (isRestoring) {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (session.user === null) {
    return (
      <>
        <SignInPage />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <AppShell userName={session.user.name} onSignOut={signOut}>
        <Outlet />
      </AppShell>
      <Toaster />
    </>
  );
}
