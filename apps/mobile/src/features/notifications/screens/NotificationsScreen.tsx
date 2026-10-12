import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { useSession } from '@/features/auth/hooks/use-session.ts';
import { LoadMore } from '@/components/ui/LoadMore';
import { Loading } from '@/components/ui/Loading';
import { DayPicker } from '../components/DayPicker';
import { NotificationRow } from '../components/NotificationRow';
import { useNotifications } from '../hooks/use-notifications.ts';
import { useOpenNotification } from '../hooks/use-open-notification.ts';
import { dayLabel, indiaToday } from '../india-day.ts';

type ScreenState = 'loading' | 'empty' | 'list';

function screenState(isPending: boolean, isEmpty: boolean): ScreenState {
  if (isPending) return 'loading';
  if (isEmpty) return 'empty';
  return 'list';
}

export function NotificationsScreen() {
  const [day, setDay] = useState(indiaToday);
  const session = useSession();
  const notifications = useNotifications(day);
  const open = useOpenNotification();

  const codeOf = (projectId: string | null): string | null =>
    session.user?.projects.find((project) => project.projectId === projectId)?.code ?? null;

  const unreadCount = notifications.data?.pages[0]?.unreadCount ?? 0;
  const items = notifications.items;
  const state = screenState(notifications.isPending, items.length === 0);

  return (
    <View className="flex-1 bg-background">
      <View className="gap-2 px-5 pt-3 pb-2">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-3xl font-extrabold text-foreground">Notifications</Text>
          {unreadCount === 0 ? null : (
            <Text className="text-sm font-bold text-clay-700">
              {`${String(unreadCount)} unread`}
            </Text>
          )}
        </View>

        <DayPicker selectedDate={day} onSelect={setDay} />
      </View>

      {state === 'loading' ? <Loading /> : null}

      {state === 'empty' ? (
        <View className="flex-1 justify-center px-5">
          <EmptyState
            title={`Nothing on ${dayLabel(day).toLowerCase()}`}
            detail="Pick another day, or check back when the Kiaan team posts something new."
          />
        </View>
      ) : null}

      {state === 'list' ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-2 px-5 pt-1 pb-10"
          refreshControl={
            <RefreshControl
              refreshing={notifications.isRefetching}
              onRefresh={() => {
                void notifications.refetch();
              }}
            />
          }
        >
          {items.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              projectCode={codeOf(notification.projectId)}
              onPress={() => {
                open(notification);
              }}
            />
          ))}

          <LoadMore
            hasMore={notifications.hasNextPage}
            isLoading={notifications.isFetchingNextPage}
            label="Show more from this day"
            onPress={() => {
              void notifications.fetchNextPage();
            }}
          />
        </ScrollView>
      ) : null}
    </View>
  );
}
