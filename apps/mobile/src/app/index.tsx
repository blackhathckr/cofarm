import { Redirect } from 'expo-router';
import { Spinner } from 'heroui-native';
import { View } from 'react-native';

import { useRestoreSession, useSession } from '@/features/auth/hooks/use-session.ts';

export default function Entry() {
  const session = useSession();
  const { isRestoring } = useRestoreSession();

  if (isRestoring) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  return <Redirect href={session.user === null ? '/sign-in' : '/(tabs)'} />;
}
