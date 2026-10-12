import type {
  EntityReceipts,
  ReceiptsQuery,
  RemindUnreadBody,
  RemindUnreadResult,
} from '@cofarm/contracts/tracking';
import type { FastifyRequest } from 'fastify';

import { assertScope } from '../../lib/project-scope.ts';

import * as service from './tracking.service.ts';

export async function receipts(
  request: FastifyRequest<{ Querystring: ReceiptsQuery }>,
): Promise<EntityReceipts> {
  return service.receiptsFor(assertScope(request.scope), request.query);
}

export async function remindAll(
  request: FastifyRequest<{ Body: RemindUnreadBody }>,
): Promise<RemindUnreadResult> {
  return service.remindUnread(assertScope(request.scope), request.body);
}
