import type { Notification } from '@cofarm/contracts/notifications';
import { cn } from 'cn';
import { Chip } from 'heroui-native';
import { Pressable, Text, View } from 'react-native';

type NotificationRowProps = {
  notification: Notification;
  projectCode: string | null;
  onPress: () => void;
};

/** 14:05, in India, which is where the notification was sent. */
function timeOf(createdAt: string): string {
  const sent = new Date(Date.parse(createdAt) + 330 * 60_000);
  return `${String(sent.getUTCHours()).padStart(2, '0')}:${String(sent.getUTCMinutes()).padStart(2, '0')}`;
}

export function NotificationRow({ notification, projectCode, onPress }: NotificationRowProps) {
  const isUnread = notification.readAt === null;

  return (
    <Pressable
      className={cn(
        'gap-1 rounded-3xl p-4',
        isUnread ? 'border border-clay-300 bg-clay-50' : 'bg-surface-secondary',
      )}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${notification.body}`}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-base font-bold text-foreground">{notification.title}</Text>
        {isUnread ? (
          <Chip size="sm" variant="soft">
            New
          </Chip>
        ) : null}
      </View>

      <Text className="text-sm text-muted">{notification.body}</Text>
      <Text className="text-xs text-muted">
        {projectCode === null
          ? timeOf(notification.createdAt)
          : `${projectCode} · ${timeOf(notification.createdAt)}`}
      </Text>
    </Pressable>
  );
}
