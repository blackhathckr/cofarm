import { formatDateTime } from '@/lib/date-format.ts';

export function formatLastLogin(timestamp: string | null): string {
  return timestamp === null ? 'Never' : formatDateTime(timestamp);
}
