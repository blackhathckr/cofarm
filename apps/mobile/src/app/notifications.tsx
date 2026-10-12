import { Redirect } from 'expo-router';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { useSession } from '@/features/auth/hooks/use-session.ts';
import { NotificationsScreen } from '@/features/notifications/screens/NotificationsScreen';

export default function Notifications() {
  const session = useSession();

  if (session.user === null) return <Redirect href="/sign-in" />;

  return (
    <SafeScreen edges={['top', 'bottom']} className="flex-1 bg-background">
      <NotificationsScreen />
    </SafeScreen>
  );
}
