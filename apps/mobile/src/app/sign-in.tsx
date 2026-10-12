import { Redirect } from 'expo-router';
import { SafeScreen } from '@/components/ui/SafeScreen';

import { useSession } from '@/features/auth/hooks/use-session.ts';
import { SignInScreen } from '@/features/auth/screens/SignInScreen';

export default function SignIn() {
  const session = useSession();

  if (session.user !== null) return <Redirect href="/(tabs)" />;

  return (
    <SafeScreen edges={['top', 'bottom']} className="flex-1 bg-background">
      <SignInScreen />
    </SafeScreen>
  );
}
