import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCursorList } from '@/lib/cursor-list.ts';
import { fetchNotifications, markNotificationRead } from '../notifications.api.ts';

/** `date` null reads every day, newest first. */
export function useNotifications(date: string | null) {
  return useCursorList({
    queryKey: ['notifications', date],
    fetchPage: (cursor) => fetchNotifications(cursor, date),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
    },
  });
}
