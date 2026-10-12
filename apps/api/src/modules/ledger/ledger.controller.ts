import type {
  ContributionPage,
  ExpensePage,
  LedgerEntry,
  LedgerSummary,
  LedgerSummaryQuery,
  ListContributionsQuery,
  ListExpensesQuery,
  RecordContributionBody,
  RecordExpenseBody,
  RecordRevenueBody,
  ReverseContributionBody,
  ReverseExpenseBody,
} from '@cofarm/contracts/ledger';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { assertScope } from '../../lib/project-scope.ts';

import * as service from './ledger.service.ts';

type ProjectParams = { projectId: string };
type EntryParams = ProjectParams & { entryId: string };

export async function recordExpense(
  request: FastifyRequest<{ Params: ProjectParams; Body: RecordExpenseBody }>,
  reply: FastifyReply,
): Promise<LedgerEntry> {
  const entry = await service.recordExpense(request.params.projectId, request.body);
  void reply.status(201);
  return entry;
}

export async function listExpenses(
  request: FastifyRequest<{ Params: ProjectParams; Querystring: ListExpensesQuery }>,
): Promise<ExpensePage> {
  return service.listExpenses(assertScope(request.scope), request.params.projectId, request.query);
}

export async function reverseExpense(
  request: FastifyRequest<{ Params: EntryParams; Body: ReverseExpenseBody }>,
  reply: FastifyReply,
): Promise<LedgerEntry> {
  const entry = await service.reverseExpense(
    request.params.projectId,
    request.params.entryId,
    request.body,
  );
  void reply.status(201);
  return entry;
}

export async function recordContribution(
  request: FastifyRequest<{ Params: ProjectParams; Body: RecordContributionBody }>,
  reply: FastifyReply,
): Promise<LedgerEntry> {
  const entry = await service.recordContribution(request.params.projectId, request.body);
  void reply.status(201);
  return entry;
}

export async function listContributions(
  request: FastifyRequest<{ Params: ProjectParams; Querystring: ListContributionsQuery }>,
): Promise<ContributionPage> {
  return service.listContributions(
    assertScope(request.scope),
    request.params.projectId,
    request.query,
  );
}

export async function reverseContribution(
  request: FastifyRequest<{ Params: EntryParams; Body: ReverseContributionBody }>,
  reply: FastifyReply,
): Promise<LedgerEntry> {
  const entry = await service.reverseContribution(
    request.params.projectId,
    request.params.entryId,
    request.body,
  );
  void reply.status(201);
  return entry;
}

export async function recordRevenue(
  request: FastifyRequest<{ Params: ProjectParams; Body: RecordRevenueBody }>,
  reply: FastifyReply,
): Promise<LedgerEntry> {
  const entry = await service.recordRevenueEntry(request.params.projectId, request.body);
  void reply.status(201);
  return entry;
}

export async function summary(
  request: FastifyRequest<{ Params: ProjectParams; Querystring: LedgerSummaryQuery }>,
): Promise<LedgerSummary> {
  return service.ledgerSummary(assertScope(request.scope), request.params.projectId, request.query);
}
