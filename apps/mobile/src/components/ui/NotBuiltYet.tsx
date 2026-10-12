import { Text, View } from 'react-native';

type NotBuiltYetProps = {
  screen: string;
};

/**
 * Placeholder for a route that exists so navigation is complete, but whose
 * screen is still to come. Replace the route's body; delete this when the last
 * one lands.
 */
export function NotBuiltYet({ screen }: NotBuiltYetProps) {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background px-8">
      <Text className="text-lg font-extrabold text-foreground">{screen}</Text>
      <Text className="text-center text-sm text-muted">Not built yet.</Text>
    </View>
  );
}
