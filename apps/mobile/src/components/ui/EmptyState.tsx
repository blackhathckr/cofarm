import { Text, View } from 'react-native';

type EmptyStateProps = {
  title: string;
  detail?: string;
};

export function EmptyState({ title, detail }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-8 py-12">
      <Text className="text-center text-base font-bold text-foreground">{title}</Text>
      {detail === undefined ? null : (
        <Text className="text-center text-sm leading-relaxed text-muted">{detail}</Text>
      )}
    </View>
  );
}
