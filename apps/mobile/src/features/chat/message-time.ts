const TRANSCRIPT_TIME = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatMessageTime(sentAt: string): string {
  return TRANSCRIPT_TIME.format(new Date(sentAt));
}
