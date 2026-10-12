import { Redirect, Tabs } from 'expo-router';
import { useThemeColor } from 'heroui-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { usePushRegistration } from '@/features/account/hooks/use-push-registration.ts';
import { useSession } from '@/features/auth/hooks/use-session.ts';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'project', title: 'Project', icon: 'leaf' },
  { name: 'mis', title: 'MIS', icon: 'file' },
  { name: 'harvest', title: 'Harvest', icon: 'chart' },
  { name: 'chat', title: 'Chat', icon: 'chat' },
];

export default function TabsLayout() {
  const session = useSession();
  usePushRegistration();
  const accent = useThemeColor('accent');
  const muted = useThemeColor('muted');
  const surface = useThemeColor('surface');
  const border = useThemeColor('border');

  if (session.user === null) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // exactOptionalPropertyTypes rejects an explicit undefined here, and a
        // theme colour can be a platform object rather than a string.
        ...(typeof accent === 'string' ? { tabBarActiveTintColor: accent } : {}),
        ...(typeof muted === 'string' ? { tabBarInactiveTintColor: muted } : {}),
        tabBarStyle: { backgroundColor: surface, borderTopColor: border },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <Icon name={tab.icon} color={color} size={21} />,
          }}
        />
      ))}
    </Tabs>
  );
}
