import type { Permission } from '@cofarm/contracts/permissions';
import type { preHandlerHookHandler } from 'fastify';

import { assertActor, assertPermission } from '../lib/actor.ts';
import { forbidden } from '../lib/errors.ts';

export const requireAuth: preHandlerHookHandler = (request, _reply, done) => {
  assertActor(request.actor);
  done();
};

export function requireKind(kind: 'partner' | 'admin'): preHandlerHookHandler {
  return (request, _reply, done) => {
    const actor = assertActor(request.actor);
    if (actor.kind !== kind) {
      throw forbidden(`This endpoint is for ${kind} accounts`);
    }
    done();
  };
}

export function requirePermission(...permissions: readonly Permission[]): preHandlerHookHandler {
  return (request, _reply, done) => {
    const actor = assertActor(request.actor);
    for (const permission of permissions) {
      assertPermission(actor, permission);
    }
    done();
  };
}
