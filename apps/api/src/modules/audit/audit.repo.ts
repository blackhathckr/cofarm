import { and, desc, eq, type SQL } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { withinScope } from '../../db/scoped.ts';
import { auditLogs } from '../../db/schema.ts';
import type { ProjectScope } from '../../lib/project-scope.ts';

export async function insertAuditLog(row: typeof auditLogs.$inferInsert): Promise<void> {
  await db.insert(auditLogs).values(row);
}

export async function listAuditLogs(
  scope: ProjectScope,
  filters: { entityTable?: string; entityId?: string; limit: number },
): Promise<(typeof auditLogs.$inferSelect)[]> {
  const conditions: SQL[] = [withinScope(scope, auditLogs.projectId)];
  if (filters.entityTable !== undefined) {
    conditions.push(eq(auditLogs.entityTable, filters.entityTable));
  }
  if (filters.entityId !== undefined) {
    conditions.push(eq(auditLogs.entityId, filters.entityId));
  }

  return db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.at))
    .limit(filters.limit);
}
