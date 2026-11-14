import { and, asc, eq, isNull, max, type SQL } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { expenseHeads } from '../../db/schema.ts';

export type ExpenseHeadRow = typeof expenseHeads.$inferSelect;
type CostHead = ExpenseHeadRow['costHead'];

export async function listHeads(): Promise<ExpenseHeadRow[]> {
  return db
    .select()
    .from(expenseHeads)
    .orderBy(asc(expenseHeads.costHead), asc(expenseHeads.sortOrder), asc(expenseHeads.name));
}

export async function findHead(headId: string): Promise<ExpenseHeadRow | null> {
  const [row] = await db.select().from(expenseHeads).where(eq(expenseHeads.id, headId)).limit(1);
  return row ?? null;
}

export async function findSibling(input: {
  costHead: CostHead;
  parentId: string | null;
  name: string;
}): Promise<ExpenseHeadRow | null> {
  const [row] = await db
    .select()
    .from(expenseHeads)
    .where(
      and(
        eq(expenseHeads.costHead, input.costHead),
        parentCondition(input.parentId),
        eq(expenseHeads.name, input.name),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function nextSortOrder(costHead: CostHead, parentId: string | null): Promise<number> {
  const [row] = await db
    .select({ last: max(expenseHeads.sortOrder) })
    .from(expenseHeads)
    .where(and(eq(expenseHeads.costHead, costHead), parentCondition(parentId)));
  return (row?.last ?? -1) + 1;
}

export async function insertHead(row: typeof expenseHeads.$inferInsert): Promise<ExpenseHeadRow> {
  const [created] = await db.insert(expenseHeads).values(row).returning();
  if (created === undefined) throw new Error('Insert returned no expense head row');
  return created;
}

export async function updateHead(
  headId: string,
  patch: Partial<typeof expenseHeads.$inferInsert>,
): Promise<ExpenseHeadRow | null> {
  const [updated] = await db
    .update(expenseHeads)
    .set(patch)
    .where(eq(expenseHeads.id, headId))
    .returning();
  return updated ?? null;
}

function parentCondition(parentId: string | null): SQL {
  return parentId === null ? isNull(expenseHeads.parentId) : eq(expenseHeads.parentId, parentId);
}
