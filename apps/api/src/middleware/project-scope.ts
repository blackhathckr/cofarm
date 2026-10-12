import type { preHandlerHookHandler } from 'fastify';

import { actorScope, assertActor } from '../lib/actor.ts';
import { assertInScope } from '../lib/project-scope.ts';

export const attachProjectScope: preHandlerHookHandler = (request, _reply, done) => {
  request.scope = actorScope(assertActor(request.actor));
  done();
};

export const requireProjectInScope: preHandlerHookHandler = (request, _reply, done) => {
  const scope = actorScope(assertActor(request.actor));
  request.scope = scope;

  const params = request.params as { projectId?: string } | undefined;
  const projectId = params?.projectId;
  if (projectId !== undefined) {
    assertInScope(scope, projectId);
  }
  done();
};
