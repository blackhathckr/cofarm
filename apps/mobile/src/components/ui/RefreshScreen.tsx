import type { ReactNode } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

type RefreshScreenProps = {
  isRefreshing: boolean;
  onRefresh: () => void;
  /** Centres the children, which is what a loading or empty state wants. */
  isCentred?: boolean;
  children: ReactNode;
};

/** A screen state that can still be pulled to refresh, which an empty one must. */
export function RefreshScreen({
  isRefreshing,
  onRefresh,
  isCentred = true,
  children,
}: RefreshScreenProps) {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName={`grow px-5 pb-10 ${isCentred ? 'justify-center' : ''}`}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {children}
    </ScrollView>
  );
}
