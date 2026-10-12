import { useThemeColor } from 'heroui-native';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';

type DashboardGreetingProps = {
  name: string;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenAccount: () => void;
};

export function DashboardGreeting({
  name,
  unreadCount,
  onOpenNotifications,
  onOpenAccount,
}: DashboardGreetingProps) {
  const accent = useThemeColor('accent');

  return (
    <View className="flex-row items-start justify-between gap-2">
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold text-muted">Good morning</Text>
        <Text className="text-3xl font-extrabold text-foreground">{name}</Text>
      </View>

      <Pressable
        className="h-11 w-11 items-center justify-center rounded-full bg-surface"
        accessibilityRole="button"
        accessibilityLabel={
          unreadCount === 0 ? 'Notifications' : `Notifications, ${String(unreadCount)} unread`
        }
        onPress={onOpenNotifications}
      >
        <Icon name="bell" color={accent} size={20} />
        {unreadCount === 0 ? null : (
          <View className="absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full bg-clay-500" />
        )}
      </Pressable>

      <Pressable
        className="h-11 w-11 items-center justify-center rounded-full bg-surface"
        accessibilityRole="button"
        accessibilityLabel="Account and settings"
        onPress={onOpenAccount}
      >
        <Icon name="user" color={accent} size={20} />
      </Pressable>
    </View>
  );
}
