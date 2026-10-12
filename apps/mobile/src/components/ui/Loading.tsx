import { Spinner } from 'heroui-native';
import { View } from 'react-native';

/** Centred in whatever box it is given, so a screen never shows a stray corner spinner. */
export function Loading() {
  return (
    <View className="flex-1 items-center justify-center bg-background py-10">
      <Spinner />
    </View>
  );
}
