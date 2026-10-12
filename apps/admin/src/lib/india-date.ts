const IST_OFFSET_MINUTES = 330;

/**
 * Every user is in IST and the server validates a date the same way, so a
 * picker bounded by the browser's calendar day would offer a date the server
 * rejects as being in the future.
 */
export function indiaToday(): string {
  return new Date(Date.now() + IST_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}
