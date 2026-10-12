import type { onSendAsyncHookHandler, preValidationAsyncHookHandler } from 'fastify';

import { assertActor } from '../lib/actor.ts';
import { badRequest } from '../lib/errors.ts';
import * as idempotency from '../modules/idempotency/idempotency.service.ts';

const HEADER = 'idempotency-key';

declare module 'fastify' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface FastifyRequest {
    idempotencyRecordId: string | null;
  }
}

function readKey(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length < 8) {
    throw badRequest(
      'This endpoint requires an Idempotency-Key header',
      'Send a unique value of at least 8 characters, and reuse it when retrying.',
    );
  }
  return value.trim().slice(0, 200);
}

/**
 * Put on any endpoint whose effect is visible to partners — publishing a
 * report, an update, a harvest. A replayed key returns the first response
 * instead of notifying everyone a second time.
 */
export const requireIdempotencyKey: preValidationAsyncHookHandler = async (request, reply) => {
  const actor = assertActor(request.actor);
  const key = readKey(request.headers[HEADER]);

  const outcome = await idempotency.claimKey({
    userId: actor.userId,
    route: `${request.method} ${request.routeOptions.url ?? request.url}`,
    key,
    body: request.body,
  });

  if (outcome.kind === 'replay') {
    request.idempotencyRecordId = null;
    await reply
      .status(outcome.response.status)
      .header('idempotent-replay', 'true')
      .send(outcome.response.body);
    return;
  }

  request.idempotencyRecordId = outcome.recordId;
};

/** Registered once in app.ts; stores the response of a claimed request. */
export const captureIdempotentResponse: onSendAsyncHookHandler = async (
  request,
  reply,
  payload,
) => {
  const recordId = request.idempotencyRecordId;
  if (recordId === null) return payload;

  request.idempotencyRecordId = null;
  const body: unknown = typeof payload === 'string' ? JSON.parse(payload) : null;
  await idempotency.recordResponse(recordId, reply.statusCode, body);

  return payload;
};
