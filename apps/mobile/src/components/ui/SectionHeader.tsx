import { Text, View } from 'react-native';

type SectionHeaderProps = {
  title: string;
  action?: string;
};

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-xs font-bold tracking-wider text-muted uppercase">{title}</Text>
      {action === undefined ? null : (
        <Text className="text-xs font-bold text-clay-700">{action}</Text>
      )}
    </View>
  );
}
