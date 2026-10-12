import type { AdminDashboard, PartnerDashboard } from '@cofarm/contracts/dashboard';
import type { FastifyRequest } from 'fastify';

import { assertActor } from '../../lib/actor.ts';
import { assertScope } from '../../lib/project-scope.ts';

import * as service from './dashboard.service.ts';

export async function admin(request: FastifyRequest): Promise<AdminDashboard> {
  const actor = assertActor(request.actor);
  return service.adminDashboard(assertScope(request.scope), actor.userId);
}

export async function partner(request: FastifyRequest): Promise<PartnerDashboard> {
  const actor = assertActor(request.actor);
  return service.partnerDashboard(assertScope(request.scope), actor.userId);
}
