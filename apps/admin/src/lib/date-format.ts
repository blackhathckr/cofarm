const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });
const timeOnly = new Intl.DateTimeFormat('en-IN', { timeStyle: 'short' });

export function formatDateTime(timestamp: string): string {
  return dateTime.format(new Date(timestamp));
}

export function formatDate(timestamp: string): string {
  return dateOnly.format(new Date(timestamp));
}

export function formatTime(timestamp: string): string {
  return timeOnly.format(new Date(timestamp));
}
