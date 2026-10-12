import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { preHandlerHookHandler } from 'fastify';

import { assertActor, assertPermission } from '../../lib/actor.ts';

/**
 * A partner reaches their own project's money through the project scope alone;
 * an admin reaches every project, so the finance permission gates them instead.
 */
export const requireExpenseRead: preHandlerHookHandler = (request, _reply, done) => {
  const actor = assertActor(request.actor);
  if (actor.kind === 'admin') {
    assertPermission(actor, PERMISSIONS.expenseRead);
  }
  done();
};
