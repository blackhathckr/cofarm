import { ERROR_CODES } from '@cofarm/contracts/errors';
import type {
  CreateExpenseHeadBody,
  ExpenseHead,
  UpdateExpenseHeadBody,
} from '@cofarm/contracts/expense-heads';
import { newId } from '@cofarm/core/id';
import type { CostHead } from '@cofarm/core/pnl';

import { badRequest, conflict, notFound } from '../../lib/errors.ts';
import * as audit from '../audit/audit.service.ts';
import * as repo from './expense-heads.repo.ts';

const ENTITY_TABLE = 'expense_heads';

export async function listHeads(): Promise<ExpenseHead[]> {
  const rows = await repo.listHeads();
  return rows.map(toDto);
}

export async function createHead(input: CreateExpenseHeadBody): Promise<ExpenseHead> {
  const parent = 'parentId' in input ? await parentFor(input.parentId) : null;
  const costHead = parent === null ? costHeadOf(input) : parent.costHead;
  const parentId = parent?.id ?? null;
  await assertNameFree({ costHead, parentId, name: input.name });

  const created = await repo.insertHead({
    id: newId(),
    costHead,
    parentId,
    name: input.name,
    sortOrder: await repo.nextSortOrder(costHead, parentId),
  });

  await audit.record({
    action: 'expense_head.created',
    entityTable: ENTITY_TABLE,
    entityId: created.id,
    projectId: null,
    after: created,
  });

  return toDto(created);
}

export async function updateHead(
  headId: string,
  input: UpdateExpenseHeadBody,
): Promise<ExpenseHead> {
  const before = await repo.findHead(headId);
  if (before === null) throw notFound('Expense');

  if (input.name !== undefined && input.name !== before.name) {
    await assertNameFree({
      costHead: before.costHead,
      parentId: before.parentId,
      name: input.name,
    });
  }

  const updated = await repo.updateHead(headId, {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.archived === undefined ? {} : { archivedAt: input.archived ? new Date() : null }),
  });
  if (updated === null) throw notFound('Expense');

  await audit.record({
    action: 'expense_head.updated',
    entityTable: ENTITY_TABLE,
    entityId: headId,
    projectId: null,
    before,
    after: updated,
  });

  return toDto(updated);
}

/** The cost head an expense filed under this head counts towards. */
export async function costHeadForExpense(headId: string): Promise<CostHead> {
  const head = await repo.findHead(headId);
  if (head === null) throw notFound('Expense');

  const parent = head.parentId === null ? null : await repo.findHead(head.parentId);
  for (const row of [head, parent]) {
    if (row !== null && row.archivedAt !== null) throw badRequest(`"${row.name}" is archived`);
  }

  return head.costHead;
}

async function parentFor(parentId: string): Promise<repo.ExpenseHeadRow> {
  const parent = await repo.findHead(parentId);
  if (parent === null) throw notFound('Expense');
  if (parent.parentId !== null) throw badRequest('A detail cannot have details of its own');
  return parent;
}

function costHeadOf(input: CreateExpenseHeadBody): CostHead {
  if ('costHead' in input) return input.costHead;
  throw badRequest('Choose a category or an expense to file this under');
}

async function assertNameFree(input: {
  costHead: CostHead;
  parentId: string | null;
  name: string;
}): Promise<void> {
  const existing = await repo.findSibling(input);
  if (existing !== null) {
    throw conflict(ERROR_CODES.expenseHeadExists, `"${input.name}" already exists here`);
  }
}

function toDto(row: repo.ExpenseHeadRow): ExpenseHead {
  return {
    id: row.id,
    costHead: row.costHead,
    parentId: row.parentId,
    name: row.name,
    sortOrder: row.sortOrder,
    archived: row.archivedAt !== null,
  };
}
