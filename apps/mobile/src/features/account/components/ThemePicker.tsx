import { Chip } from 'heroui-native';
import { Text, View } from 'react-native';

import { useThemePreference, type ThemePreference } from '@/lib/theme-preference.ts';

const OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match phone' },
];

export function ThemePicker() {
  const { preference, setPreference } = useThemePreference();

  return (
    <View className="gap-3">
      <Text className="text-xs font-bold tracking-wider text-muted uppercase">Appearance</Text>
      <View className="flex-row gap-2">
        {OPTIONS.map((option) => (
          <Chip
            key={option.value}
            variant={option.value === preference ? 'primary' : 'secondary'}
            accessibilityRole="radio"
            accessibilityState={{ selected: option.value === preference }}
            onPress={() => {
              setPreference(option.value);
            }}
          >
            {option.label}
          </Chip>
        ))}
      </View>
    </View>
  );
}
