import { createHash } from 'node:crypto';

import { ERROR_CODES } from '@cofarm/contracts/errors';
import { newId } from '@cofarm/core/id';

import { conflict } from '../../lib/errors.ts';
import * as repo from './idempotency.repo.ts';

export type ReplayedResponse = {
  status: number;
  body: unknown;
};

export type ClaimOutcome =
  { kind: 'proceed'; recordId: string } | { kind: 'replay'; response: ReplayedResponse };

export function fingerprint(body: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(body ?? null))
    .digest('base64url');
}

/**
 * A publish that notifies every partner on a project must not fire twice
 * because a tap was repeated or a connection dropped mid-response.
 *
 * The first call claims the key; a repeat with the same body replays the stored
 * response, and a repeat with a different body is a mistake worth surfacing
 * rather than silently treating as either call.
 */
export async function claimKey(input: {
  userId: string;
  route: string;
  key: string;
  body: unknown;
}): Promise<ClaimOutcome> {
  const requestFingerprint = fingerprint(input.body);

  const claimed = await repo.claim({
    id: newId(),
    key: input.key,
    userId: input.userId,
    route: input.route,
    requestFingerprint,
  });
  if (claimed !== null) return { kind: 'proceed', recordId: claimed.id };

  const existing = await repo.findRecord(input.userId, input.route, input.key);
  if (existing === null) return { kind: 'proceed', recordId: newId() };

  if (existing.requestFingerprint !== requestFingerprint) {
    throw conflict(
      ERROR_CODES.idempotencyMismatch,
      'That idempotency key was already used with a different request',
      'Use a new key, or resend the original request body.',
    );
  }

  if (existing.completedAt === null) {
    throw conflict(
      ERROR_CODES.idempotencyMismatch,
      'The first request with this key is still in flight',
      'Retry in a moment.',
    );
  }

  return {
    kind: 'replay',
    response: { status: existing.responseStatus ?? 200, body: existing.responseBody },
  };
}

export async function recordResponse(
  recordId: string,
  status: number,
  body: unknown,
): Promise<void> {
  // Only a success is worth replaying; a failed attempt should be retryable
  // with the same key.
  if (status >= 400) {
    await repo.releaseRecord(recordId);
    return;
  }
  await repo.completeRecord(recordId, status, body);
}

export async function release(recordId: string): Promise<void> {
  await repo.releaseRecord(recordId);
}
