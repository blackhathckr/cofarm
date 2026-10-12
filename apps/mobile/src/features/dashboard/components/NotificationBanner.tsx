import type { Notification } from '@cofarm/contracts/notifications';
import { useThemeColor } from 'heroui-native';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';

type NotificationBannerProps = {
  notification: Notification | null;
  isDismissing: boolean;
  onPress: (notification: Notification) => void;
};

export function NotificationBanner({
  notification,
  isDismissing,
  onPress,
}: NotificationBannerProps) {
  const accent = useThemeColor('accent');
  if (notification === null) return null;

  return (
    <Pressable
      className="flex-row items-center gap-3 rounded-3xl border border-clay-300 bg-clay-50 p-4"
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. Tap to open it and mark it as read.`}
      disabled={isDismissing}
      onPress={() => {
        onPress(notification);
      }}
    >
      <Icon name="bell" color={accent} size={20} />
      <View className="flex-1 gap-1">
        <Text className="text-base font-bold text-clay-900">{notification.title}</Text>
        <Text className="text-sm text-clay-800" numberOfLines={2}>
          {notification.body}
        </Text>
      </View>
      <Text className="text-xs font-bold text-clay-700">{isDismissing ? 'Opening…' : 'Open'}</Text>
    </Pressable>
  );
}
