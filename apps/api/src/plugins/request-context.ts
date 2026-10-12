import { randomUUID } from 'node:crypto';

import type { FastifyInstance } from 'fastify';

import { runWithContext } from '../lib/request-context.ts';

/**
 * Opens the async context for the whole request so the audit writer can name
 * the actor without every service threading one through.
 *
 * Registered before authentication, so the actor is attached in a second pass
 * once identity is known.
 */
export function registerRequestContext(app: FastifyInstance): void {
  app.addHook('onRequest', (request, _reply, done) => {
    const requestId = request.headers['x-request-id'];
    const id = typeof requestId === 'string' && requestId.length > 0 ? requestId : randomUUID();

    request.id = id;
    runWithContext({ requestId: id, actorUserId: null, ip: request.ip }, done);
  });

  app.addHook('onSend', (_request, reply, payload, done) => {
    reply.header('x-request-id', _request.id);
    done(null, payload);
  });
}
