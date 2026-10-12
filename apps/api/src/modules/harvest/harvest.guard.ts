import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { preHandlerHookHandler } from 'fastify';

import { assertActor, assertPermission } from '../../lib/actor.ts';

export const requireHarvestRead: preHandlerHookHandler = (request, _reply, done) => {
  const actor = assertActor(request.actor);
  if (actor.kind === 'admin') {
    assertPermission(actor, PERMISSIONS.harvestRead);
  }
  done();
};

export const requireStatementRead: preHandlerHookHandler = (request, _reply, done) => {
  const actor = assertActor(request.actor);
  if (actor.kind === 'admin') {
    assertPermission(actor, PERMISSIONS.statementRead);
  }
  done();
};
