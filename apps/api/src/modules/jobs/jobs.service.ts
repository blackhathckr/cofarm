import { newId } from '@cofarm/core/id';

import { notFound } from '../../lib/errors.ts';
import { logger } from '../../lib/logger.ts';

import * as repo from './jobs.repo.ts';

export type JobStatus = repo.JobStatus;

const DEFAULT_MAX_ATTEMPTS = 5;
const BACKOFF_CAP_MINUTES = 60;
const ERROR_LENGTH_LIMIT = 2000;

export type Job = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  runAt: string;
  lockedAt: string | null;
  lockedBy: string | null;
  lastError: string | null;
  dedupeKey: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type JobOverview = {
  items: Job[];
  counts: Record<JobStatus, number>;
};

export type EnqueueJobInput = {
  type: string;
  payload?: Record<string, unknown>;
  runAt?: Date;
  dedupeKey?: string;
  maxAttempts?: number;
};

export type ListJobsInput = {
  status: JobStatus | undefined;
  type: string | undefined;
  limit: number;
};

export async function enqueue(input: EnqueueJobInput): Promise<Job> {
  const created = await repo.insertJob({
    id: newId(),
    type: input.type,
    payload: input.payload ?? {},
    runAt: input.runAt ?? new Date(),
    dedupeKey: input.dedupeKey ?? null,
    maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
  });

  if (created !== null) return toJobDto(created);

  if (input.dedupeKey === undefined) throw new Error('Insert returned no job row');

  const existing = await repo.findJobByDedupeKey(input.dedupeKey);
  if (existing === null) throw new Error('Insert returned no job row');
  return toJobDto(existing);
}

export type ScheduleRecurringInput = {
  type: string;
  runAt: Date;
  payload?: Record<string, unknown>;
  maxAttempts?: number;
};

/**
 * `jobs_dedupe_key_key` never expires, so a recurring job is deduped by its run
 * date: one row per day per type, and a repeat call for a day already booked
 * returns that row instead of queueing a second run.
 */
export async function scheduleRecurring(input: ScheduleRecurringInput): Promise<Job> {
  return enqueue({
    type: input.type,
    runAt: input.runAt,
    dedupeKey: `${input.type}:${input.runAt.toISOString().slice(0, 10)}`,
    ...(input.payload === undefined ? {} : { payload: input.payload }),
    ...(input.maxAttempts === undefined ? {} : { maxAttempts: input.maxAttempts }),
  });
}

export async function claimNext(workerId: string): Promise<Job | null> {
  const claimed = await repo.claimNextJob(workerId, new Date());
  return claimed === null ? null : toJobDto(claimed);
}

export async function complete(jobId: string): Promise<Job> {
  const done = await repo.markJobDone(jobId, new Date());
  if (done === null) throw notFound('Job');
  return toJobDto(done);
}

/**
 * The attempt counter is raised when the job is claimed, so the first failure
 * already reads 1 and the first retry waits two minutes.
 */
export async function fail(jobId: string, error: string): Promise<Job> {
  const job = await repo.findJob(jobId);
  if (job === null) throw notFound('Job');

  const message = error.slice(0, ERROR_LENGTH_LIMIT);

  if (job.attempts >= job.maxAttempts) {
    const failed = await repo.markJobFailed(jobId, new Date(), message);
    if (failed === null) throw notFound('Job');
    logger.error(
      { jobId, jobType: job.type, attempts: job.attempts, maxAttempts: job.maxAttempts },
      'job exhausted its attempts',
    );
    return toJobDto(failed);
  }

  const delayMinutes = Math.min(2 ** job.attempts, BACKOFF_CAP_MINUTES);
  const rescheduled = await repo.rescheduleJob(
    jobId,
    new Date(Date.now() + delayMinutes * 60_000),
    message,
  );
  if (rescheduled === null) throw notFound('Job');

  logger.warn(
    { jobId, jobType: job.type, attempts: job.attempts, delayMinutes },
    'job retry scheduled',
  );
  return toJobDto(rescheduled);
}

export async function listJobs(input: ListJobsInput): Promise<JobOverview> {
  const [rows, grouped] = await Promise.all([
    repo.listJobs({ status: input.status, type: input.type, limit: input.limit }),
    repo.countJobsByStatus(),
  ]);

  const counts = { pending: 0, running: 0, done: 0, failed: 0 };
  for (const row of grouped) {
    counts[row.status] = row.total;
  }

  return { items: rows.map(toJobDto), counts };
}

function toJobDto(row: repo.JobRow): Job {
  return {
    id: row.id,
    type: row.type,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    runAt: row.runAt.toISOString(),
    lockedAt: row.lockedAt === null ? null : row.lockedAt.toISOString(),
    lockedBy: row.lockedBy,
    lastError: row.lastError,
    dedupeKey: row.dedupeKey,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt === null ? null : row.completedAt.toISOString(),
  };
}
