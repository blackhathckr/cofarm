import type { Message } from '@cofarm/contracts/messaging';
import { cn } from 'cn';
import { Text, View } from 'react-native';

import { formatMessageTime } from '../message-time.ts';

type MessageBubbleProps = {
  message: Message;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isMine = message.senderKind === 'partner';

  return (
    <View className={cn('flex-row', isMine ? 'justify-end' : 'justify-start')}>
      <View
        className={cn(
          'max-w-xs gap-1 rounded-3xl px-4 py-3',
          isMine ? 'bg-sage-100' : 'bg-surface-secondary',
        )}
      >
        {isMine ? null : (
          <Text className="text-xs font-bold text-clay-700">{message.senderName}</Text>
        )}
        <Text className={cn('text-sm', isMine ? 'text-sage-800' : 'text-foreground')}>
          {message.body}
        </Text>
        <Text className={cn('text-xs', isMine ? 'text-sage-600' : 'text-muted')}>
          {formatMessageTime(message.sentAt)}
        </Text>
      </View>
    </View>
  );
}
