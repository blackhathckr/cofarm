import { and, asc, count, desc, eq, lte, sql, type SQL } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { jobs } from '../../db/schema.ts';

export type JobRow = typeof jobs.$inferSelect;
export type JobStatus = JobRow['status'];

export type JobFilters = {
  status: JobStatus | undefined;
  type: string | undefined;
  limit: number;
};

/**
 * `jobs_dedupe_key_key` is unique across every status and never expires, so a
 * repeat key is an existing job rather than an error.
 */
export async function insertJob(row: typeof jobs.$inferInsert): Promise<JobRow | null> {
  const [created] = await db
    .insert(jobs)
    .values(row)
    .onConflictDoNothing({ target: jobs.dedupeKey })
    .returning();
  return created ?? null;
}

export async function findJobByDedupeKey(dedupeKey: string): Promise<JobRow | null> {
  const [row] = await db.select().from(jobs).where(eq(jobs.dedupeKey, dedupeKey)).limit(1);
  return row ?? null;
}

export async function findJob(jobId: string): Promise<JobRow | null> {
  const [row] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  return row ?? null;
}

/**
 * `for update skip locked` inside the transaction is what makes the table a
 * queue: two workers polling at the same instant take different rows instead
 * of blocking on each other.
 */
export async function claimNextJob(workerId: string, now: Date): Promise<JobRow | null> {
  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.status, 'pending'), lte(jobs.runAt, now)))
      .orderBy(asc(jobs.runAt), asc(jobs.id))
      .limit(1)
      .for('update', { skipLocked: true });

    if (candidate === undefined) return null;

    const [claimed] = await tx
      .update(jobs)
      .set({
        status: 'running',
        attempts: sql`${jobs.attempts} + 1`,
        lockedAt: now,
        lockedBy: workerId,
      })
      .where(eq(jobs.id, candidate.id))
      .returning();

    return claimed ?? null;
  });
}

export async function markJobDone(jobId: string, now: Date): Promise<JobRow | null> {
  const [updated] = await db
    .update(jobs)
    .set({ status: 'done', completedAt: now, lockedAt: null, lockedBy: null, lastError: null })
    .where(eq(jobs.id, jobId))
    .returning();
  return updated ?? null;
}

export async function rescheduleJob(
  jobId: string,
  runAt: Date,
  error: string,
): Promise<JobRow | null> {
  const [updated] = await db
    .update(jobs)
    .set({ status: 'pending', runAt, lockedAt: null, lockedBy: null, lastError: error })
    .where(eq(jobs.id, jobId))
    .returning();
  return updated ?? null;
}

export async function markJobFailed(
  jobId: string,
  now: Date,
  error: string,
): Promise<JobRow | null> {
  const [updated] = await db
    .update(jobs)
    .set({ status: 'failed', completedAt: now, lockedAt: null, lockedBy: null, lastError: error })
    .where(eq(jobs.id, jobId))
    .returning();
  return updated ?? null;
}

export async function listJobs(filters: JobFilters): Promise<JobRow[]> {
  const conditions: SQL[] = [];
  if (filters.status !== undefined) conditions.push(eq(jobs.status, filters.status));
  if (filters.type !== undefined) conditions.push(eq(jobs.type, filters.type));

  return db
    .select()
    .from(jobs)
    .where(conditions.length === 0 ? undefined : and(...conditions))
    .orderBy(desc(jobs.createdAt), desc(jobs.id))
    .limit(filters.limit);
}

export async function countJobsByStatus(): Promise<{ status: JobStatus; total: number }[]> {
  return db.select({ status: jobs.status, total: count() }).from(jobs).groupBy(jobs.status);
}
