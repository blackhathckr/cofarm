import type { FastifyInstance } from 'fastify';

import type { Actor } from '../lib/actor.ts';
import type { ProjectScope } from '../lib/project-scope.ts';
import { unauthorized } from '../lib/errors.ts';
import { currentContext, runWithContext } from '../lib/request-context.ts';
import { verifyAccessToken } from '../lib/token.ts';
import * as authService from '../modules/auth/auth.service.ts';

declare module 'fastify' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface FastifyRequest {
    actor: Actor | null;
    scope: ProjectScope | null;
  }
}

/**
 * Resolves identity from the bearer token, then loads permissions and active
 * memberships from live rows. One query pair per request buys the guarantee
 * that a revoked membership stops working immediately.
 *
 * A missing or bad token is not rejected here — public routes exist. Guards on
 * the route decide.
 */
export function registerAuthentication(app: FastifyInstance): void {
  app.decorateRequest('actor', null);
  app.decorateRequest('scope', null);
  app.decorateRequest('idempotencyRecordId', null);

  app.addHook('onRequest', async (request) => {
    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ') !== true) return;

    const claims = await verifyAccessToken(header.slice('Bearer '.length).trim());
    const actor = await authService.resolveActor(claims.sub);
    if (actor === null) throw unauthorized('Account is not active');

    request.actor = actor;

    const context = currentContext();
    if (context !== undefined) {
      context.actorUserId = actor.userId;
    }
    request.log = request.log.child({ actorUserId: actor.userId });
  });

  app.addHook('preHandler', (request, _reply, done) => {
    const context = currentContext();
    if (context === undefined) {
      done();
      return;
    }
    runWithContext(context, done);
  });
}
