import type { Document } from '@cofarm/contracts/documents';
import { Spinner, useThemeColor } from 'heroui-native';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';

type DocumentRowProps = {
  document: Document;
  isOpening: boolean;
  onOpen: (documentId: string) => void;
};

export function DocumentRow({ document, isOpening, onOpen }: DocumentRowProps) {
  const muted = useThemeColor('muted');

  return (
    <Pressable
      className="flex-row items-center justify-between gap-3 rounded-2xl bg-surface-secondary p-3"
      accessibilityRole="button"
      accessibilityLabel={`Open ${document.originalName}`}
      disabled={isOpening}
      onPress={() => {
        onOpen(document.id);
      }}
    >
      <View className="flex-1 gap-1">
        <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
          {document.originalName}
        </Text>
        <Text className="text-xs text-muted">{document.createdAt.slice(0, 10)}</Text>
      </View>

      {isOpening ? <Spinner size="sm" /> : <Icon name="download" size={18} color={muted} />}
    </Pressable>
  );
}
