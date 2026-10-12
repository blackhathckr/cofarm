import { MAX_MESSAGE_LENGTH } from '@cofarm/contracts/messaging';
import { useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';

type MessageComposerProps = {
  isSending: boolean;
  errorMessage: string | null;
  onSend: (body: string) => void;
};

export function MessageComposer({ isSending, errorMessage, onSend }: MessageComposerProps) {
  const [draft, setDraft] = useState('');
  const placeholder = useThemeColor('muted');
  const onAccent = useThemeColor('surface');
  const body = draft.trim();
  const canSend = body.length > 0 && !isSending;

  return (
    <View className="gap-2 border-t border-separator bg-surface px-4 pt-2 pb-3">
      {errorMessage === null ? null : (
        <Text className="px-1 text-sm text-danger" accessibilityRole="alert">
          {errorMessage}
        </Text>
      )}

      <View className="flex-row items-end gap-2">
        <TextInput
          className="max-h-28 flex-1 rounded-3xl border border-border bg-background px-4 py-2.5 text-base text-foreground"
          value={draft}
          onChangeText={setDraft}
          maxLength={MAX_MESSAGE_LENGTH}
          multiline
          placeholder="Message the Kiaan team"
          placeholderTextColor={placeholder}
          accessibilityLabel="Message the Kiaan team"
        />

        <Pressable
          className={`h-11 w-11 items-center justify-center rounded-full ${
            canSend ? 'bg-accent' : 'bg-surface-secondary'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={() => {
            onSend(body);
            setDraft('');
          }}
        >
          <Icon name="send" size={18} color={canSend ? onAccent : placeholder} />
        </Pressable>
      </View>
    </View>
  );
}
