import { formatDateTime, formatTime } from '@/lib/date-format.ts';

export function formatMessageTime(timestamp: string): string {
  const sent = new Date(timestamp);
  const isToday = sent.toDateString() === new Date().toDateString();
  return isToday ? formatTime(timestamp) : formatDateTime(timestamp);
}

export function formatThreadActivity(timestamp: string | null): string {
  return timestamp === null ? 'No messages yet' : formatMessageTime(timestamp);
}
