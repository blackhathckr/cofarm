const DAY_MS = 86_400_000;

export function daysWaiting(sentAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(sentAt).getTime()) / DAY_MS));
}
