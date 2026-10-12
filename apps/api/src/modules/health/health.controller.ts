import type { FastifyReply } from 'fastify';

import type { Readiness } from './health.service.ts';
import * as service from './health.service.ts';

export function live(): { status: 'ok' } {
  return { status: 'ok' };
}

export async function ready(_request: unknown, reply: FastifyReply): Promise<Readiness> {
  const state = await service.readiness();
  void reply.status(state.status === 'ok' ? 200 : 503);
  return state;
}
