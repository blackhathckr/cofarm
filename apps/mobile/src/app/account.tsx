import { Redirect } from 'expo-router';
import { SafeScreen } from '@/components/ui/SafeScreen';

import { AccountScreen } from '@/features/account/screens/AccountScreen';
import { useSession } from '@/features/auth/hooks/use-session.ts';

export default function Account() {
  const session = useSession();

  if (session.user === null) return <Redirect href="/sign-in" />;

  return (
    <SafeScreen edges={['top', 'bottom']} className="flex-1 bg-background">
      <AccountScreen />
    </SafeScreen>
  );
}
