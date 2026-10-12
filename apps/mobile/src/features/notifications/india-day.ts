const IST_OFFSET_MINUTES = 330;
const DAY_MS = 86_400_000;

/** Today in India, which is the day every partner is actually in. */
export function indiaToday(): string {
  return new Date(Date.now() + IST_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

export function shiftDay(isoDate: string, byDays: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00.000Z`) + byDays * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function partsOf(isoDate: string): { year: number; month: number; day: number } {
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  return { year, month, day };
}

export function monthLabel(isoDate: string): string {
  const { year, month } = partsOf(isoDate);
  return `${MONTHS[month - 1] ?? ''} ${String(year)}`;
}

/** "Today", "Yesterday", or "Thu, 9 October 2026". */
export function dayLabel(isoDate: string): string {
  const today = indiaToday();
  if (isoDate === today) return 'Today';
  if (isoDate === shiftDay(today, -1)) return 'Yesterday';

  const { year, month, day } = partsOf(isoDate);
  const weekday = WEEKDAYS[new Date(Date.parse(`${isoDate}T00:00:00.000Z`)).getUTCDay()] ?? '';
  return `${weekday}, ${String(day)} ${MONTHS[month - 1] ?? ''} ${String(year)}`;
}

export type CalendarCell = { isoDate: string; day: number } | null;

/** The month as weeks of seven, padded so the first day sits under its weekday. */
export function monthGrid(isoDate: string): CalendarCell[][] {
  const { year, month } = partsOf(isoDate);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: CalendarCell[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= dayCount; day += 1) {
    const padded = `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ isoDate: padded, day });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: CalendarCell[][] = [];
  for (let start = 0; start < cells.length; start += 7) {
    weeks.push(cells.slice(start, start + 7));
  }
  return weeks;
}

export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
