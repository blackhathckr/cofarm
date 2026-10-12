import { z } from 'zod';

import { logger } from '../lib/logger.ts';
import * as documents from '../modules/documents/documents.service.ts';
import * as jobs from '../modules/jobs/jobs.service.ts';

export const DOCUMENT_SWEEP_JOB = 'document-sweep';

const PENDING_AGE_HOURS = 24;
const BATCH_LIMIT = 200;
const MAX_BATCHES = 10;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Quiet hour: the sweep touches storage, so it runs away from the day's load. */
const SWEEP_HOUR_UTC = 2;

const sweepPayloadSchema = z.object({
  olderThanHours: z.number().int().min(1).max(720).default(PENDING_AGE_HOURS),
});

type SweepBatch = {
  scanned: number;
  deleted: number;
};

/**
 * A document row is written before the client's upload, so a row that is still
 * pending long after is either an abandoned upload or one that never arrived.
 * Only rows whose object is absent from storage are removed, which makes a
 * repeat run a no-op rather than a second deletion.
 */
export async function runDocumentSweep(payload: Record<string, unknown>): Promise<void> {
  const { olderThanHours } = sweepPayloadSchema.parse(payload);
  const before = new Date(Date.now() - olderThanHours * HOUR_MS);

  let scanned = 0;
  let deleted = 0;

  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const swept = await sweepBatch(before, BATCH_LIMIT);
    scanned += swept.scanned;
    deleted += swept.deleted;
    if (swept.scanned < BATCH_LIMIT) break;
  }

  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const swept = await documents.sweepOrphanedAttachments({ before, limit: BATCH_LIMIT });
    scanned += swept.scanned;
    deleted += swept.deleted;
    if (swept.scanned < BATCH_LIMIT) break;
  }

  logger.info({ scanned, deleted, pendingBefore: before.toISOString() }, 'document sweep finished');

  await armDocumentSweep();
}

/**
 * The queue has no cron, so each run books the next one. Call this once at boot
 * as well: the dedupe key is the run date, so an extra call is a no-op and a
 * sweep that never ran today is still picked up.
 */
export async function armDocumentSweep(): Promise<void> {
  const runAt = nextRunAt(new Date());
  await jobs.scheduleRecurring({ type: DOCUMENT_SWEEP_JOB, runAt });
  logger.info({ runAt: runAt.toISOString() }, 'document sweep scheduled');
}

function sweepBatch(before: Date, limit: number): Promise<SweepBatch> {
  return documents.sweepAbandoned({ before, limit });
}

function nextRunAt(from: Date): Date {
  const today = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
    SWEEP_HOUR_UTC,
  );
  return new Date(today > from.getTime() ? today : today + DAY_MS);
}
