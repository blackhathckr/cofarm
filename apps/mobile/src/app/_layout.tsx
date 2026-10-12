import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HeroUINativeProvider } from 'heroui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

import { armForegroundNotifications } from '@/lib/notifications.ts';
import { ApiError } from '@/lib/api-client.ts';
import '../global.css';

// withUniwind gives a third-party component the className prop, so nothing in
// the tree needs an inline style.
const Root = withUniwind(GestureHandlerRootView);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (attempt, error) => !(error instanceof ApiError && error.status < 500) && attempt < 2,
    },
  },
});

// Cold-start concern, so it runs at module load rather than from a screen.
armForegroundNotifications();

export default function RootLayout() {
  return (
    <Root className="flex-1">
      <SafeAreaProvider>
        <HeroUINativeProvider>
          <QueryClientProvider client={queryClient}>
            <StatusBar style="auto" />
            <Slot />
          </QueryClientProvider>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </Root>
  );
}
