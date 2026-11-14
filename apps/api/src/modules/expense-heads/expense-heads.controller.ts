import type {
  CreateExpenseHeadBody,
  ExpenseHead,
  ExpenseHeadParams,
  UpdateExpenseHeadBody,
} from '@cofarm/contracts/expense-heads';
import type { FastifyReply, FastifyRequest } from 'fastify';

import * as service from './expense-heads.service.ts';

export async function list(): Promise<ExpenseHead[]> {
  return service.listHeads();
}

export async function create(
  request: FastifyRequest<{ Body: CreateExpenseHeadBody }>,
  reply: FastifyReply,
): Promise<ExpenseHead> {
  const head = await service.createHead(request.body);
  void reply.status(201);
  return head;
}

export async function update(
  request: FastifyRequest<{ Params: ExpenseHeadParams; Body: UpdateExpenseHeadBody }>,
): Promise<ExpenseHead> {
  return service.updateHead(request.params.headId, request.body);
}
