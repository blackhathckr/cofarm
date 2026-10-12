import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

import { logger } from '../lib/logger.ts';
import * as jobs from '../modules/jobs/jobs.service.ts';
import { PUSH_FANOUT_JOB } from '../modules/notifications/notifications.service.ts';

import { DOCUMENT_SWEEP_JOB, armDocumentSweep, runDocumentSweep } from './document-sweep.job.ts';
import { runPushFanout } from './push-fanout.job.ts';

const POLL_INTERVAL_MS = 2000;

/**
 * Each run books the next, so the chain has one seed and a lost row would
 * leave it unscheduled forever. The dedupe key is the run date, so
 * re-asserting while idle is a no-op once one is on the books.
 */
const REARM_INTERVAL_MS = 300_000;

type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers: Readonly<Record<string, JobHandler>> = {
  [PUSH_FANOUT_JOB]: runPushFanout,
  [DOCUMENT_SWEEP_JOB]: runDocumentSweep,
};

let controller: AbortController | null = null;
let loopPromise: Promise<void> | null = null;
let rearmedAt = 0;

export function startWorker(): void {
  if (controller !== null) {
    logger.warn('job worker is already running');
    return;
  }

  const active = new AbortController();
  rearmedAt = 0;
  const workerId = `${hostname()}:${process.pid.toString()}:${randomUUID().slice(0, 8)}`;
  controller = active;
  loopPromise = poll(active.signal, workerId).catch((error: unknown) => {
    logger.error({ err: error, workerId }, 'job worker loop stopped on an unhandled error');
  });

  logger.info({ workerId, pollIntervalMs: POLL_INTERVAL_MS }, 'job worker started');
}

export async function stopWorker(): Promise<void> {
  const active = controller;
  const pending = loopPromise;
  controller = null;
  loopPromise = null;

  if (active === null) return;
  active.abort();
  if (pending !== null) await pending;
  logger.info('job worker stopped');
}

async function poll(signal: AbortSignal, workerId: string): Promise<void> {
  const isStopping = (): boolean => signal.aborted;

  while (!isStopping()) {
    const handled = await claimAndRun(workerId);
    if (isStopping()) return;
    if (handled) continue;
    await rearmRecurring();
    if (isStopping()) return;
    await waitForNextPoll(POLL_INTERVAL_MS, signal);
  }
}

async function claimAndRun(workerId: string): Promise<boolean> {
  const job = await claimNext(workerId);
  if (job === null) return false;

  const handler = handlers[job.type];
  if (handler === undefined) {
    await settleFailure(job.id, `No handler registered for job type ${job.type}`);
    return true;
  }

  try {
    await handler(job.payload);
  } catch (error) {
    await settleFailure(job.id, error instanceof Error ? error.message : String(error));
    return true;
  }

  await jobs.complete(job.id);
  logger.info({ jobId: job.id, jobType: job.type, attempts: job.attempts }, 'job completed');
  return true;
}

async function rearmRecurring(): Promise<void> {
  const now = Date.now();
  if (now - rearmedAt < REARM_INTERVAL_MS) return;
  rearmedAt = now;

  try {
    await armDocumentSweep();
  } catch (error) {
    logger.error({ err: error }, 'recurring jobs could not be re-armed');
  }
}

async function claimNext(workerId: string): Promise<jobs.Job | null> {
  try {
    return await jobs.claimNext(workerId);
  } catch (error) {
    logger.error({ err: error, workerId }, 'job claim failed');
    return null;
  }
}

async function settleFailure(jobId: string, message: string): Promise<void> {
  try {
    await jobs.fail(jobId, message);
  } catch (error) {
    logger.error({ err: error, jobId }, 'job failure could not be recorded');
  }
}

function waitForNextPoll(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();

  return new Promise((resolve) => {
    const settle = (): void => {
      clearTimeout(timer);
      signal.removeEventListener('abort', settle);
      resolve();
    };
    const timer = setTimeout(settle, ms);
    signal.addEventListener('abort', settle, { once: true });
  });
}
