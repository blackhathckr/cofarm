import { v7 as uuidv7 } from 'uuid';

/**
 * uuid v7 rather than v4: the timestamp prefix keeps inserts clustered, which
 * matters for the append-only ledger and the audit log, and it gives rows a
 * natural creation order without a separate sequence.
 */
export function newId(): string {
  return uuidv7();
}
