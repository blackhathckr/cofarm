import { badRequest } from './errors.ts';

const SEPARATOR = '|';

export type DecodedCursor = {
  /** Null when the sorted column is nullable and this row's value was null. */
  sortKey: string | null;
  id: string;
};

/**
 * Keyset pagination needs the last row's sort value and its id: the sort value
 * alone is not unique, and the id alone cannot resume an ordering. Every paged
 * endpoint uses this one encoding so a cursor is validated identically
 * wherever it is presented.
 */
export function encodeCursor(sortKey: string | null, id: string): string {
  return `${sortKey ?? ''}${SEPARATOR}${id}`;
}

export function decodeCursor(cursor: string | undefined): DecodedCursor | undefined {
  if (cursor === undefined) return undefined;

  // Split once: a sort key is free to contain the separator, an id is not.
  const at = cursor.indexOf(SEPARATOR);
  if (at < 0) throw malformed();

  const sortKey = cursor.slice(0, at);
  const id = cursor.slice(at + 1);
  if (id.length === 0) throw malformed();

  return { sortKey: sortKey.length === 0 ? null : sortKey, id };
}

/** For a cursor whose sort column is a date, which is stored as a string. */
export function cursorDate(sortKey: string | null): string {
  if (sortKey === null) throw malformed();
  return sortKey;
}

/** For a cursor whose sort column is a timestamp rather than a date string. */
export function cursorTimestamp(sortKey: string | null): Date {
  if (sortKey === null) throw malformed();
  const at = new Date(sortKey);
  if (Number.isNaN(at.getTime())) throw malformed();
  return at;
}

function malformed(): Error {
  return badRequest('Malformed pagination cursor');
}
