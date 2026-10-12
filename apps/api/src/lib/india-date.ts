const IST_OFFSET_MINUTES = 330;

/**
 * The Indian calendar day, which is the only one that matters here: every user
 * is in IST, and a UTC day boundary would reject a legitimate early-morning
 * entry for being "tomorrow" every night between midnight and 05:30 IST.
 */
export function indiaToday(): string {
  return new Date(Date.now() + IST_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

export function isFutureInIndia(isoDate: string): boolean {
  return isoDate > indiaToday();
}

const DAY_MS = 86_400_000;

/** The half-open UTC instants that bound one Indian calendar day. */
export function indiaDayRange(isoDate: string): { from: Date; to: Date } {
  const midnight = Date.parse(`${isoDate}T00:00:00.000Z`) - IST_OFFSET_MINUTES * 60_000;
  return { from: new Date(midnight), to: new Date(midnight + DAY_MS) };
}
