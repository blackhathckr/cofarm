import { and, eq } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { idempotencyKeys } from '../../db/schema.ts';

export type IdempotencyRow = typeof idempotencyKeys.$inferSelect;

export async function findRecord(
  userId: string,
  route: string,
  key: string,
): Promise<IdempotencyRow | null> {
  const [row] = await db
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.userId, userId),
        eq(idempotencyKeys.route, route),
        eq(idempotencyKeys.key, key),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Returns null when the key is already claimed, so two concurrent requests
 * cannot both proceed — the unique index decides the winner, not a prior read.
 */
export async function claim(
  row: typeof idempotencyKeys.$inferInsert,
): Promise<IdempotencyRow | null> {
  const [claimed] = await db
    .insert(idempotencyKeys)
    .values(row)
    .onConflictDoNothing({
      target: [idempotencyKeys.userId, idempotencyKeys.route, idempotencyKeys.key],
    })
    .returning();
  return claimed ?? null;
}

export async function completeRecord(
  recordId: string,
  responseStatus: number,
  responseBody: unknown,
): Promise<void> {
  await db
    .update(idempotencyKeys)
    .set({ responseStatus, responseBody, completedAt: new Date() })
    .where(eq(idempotencyKeys.id, recordId));
}

export async function releaseRecord(recordId: string): Promise<void> {
  await db.delete(idempotencyKeys).where(eq(idempotencyKeys.id, recordId));
}
