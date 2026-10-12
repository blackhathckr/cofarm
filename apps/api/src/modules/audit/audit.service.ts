import { newId } from '@cofarm/core/id';

import { logger } from '../../lib/logger.ts';
import { currentContext } from '../../lib/request-context.ts';
import * as repo from './audit.repo.ts';

export type AuditRecord = {
  action: string;
  entityTable: string;
  entityId: string | null;
  projectId: string | null;
  before?: unknown;
  after?: unknown;
};

/**
 * Every money column is a BigInt, which `JSON.stringify` refuses. Without this
 * the before/after of exactly the financial actions the trail exists for fail
 * to serialise, and the row is lost to the catch below.
 */
function jsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, jsonSafe(inner)]));
  }
  return value;
}

export async function record(entry: AuditRecord): Promise<void> {
  const context = currentContext();
  try {
    await repo.insertAuditLog({
      id: newId(),
      actorUserId: context?.actorUserId ?? null,
      projectId: entry.projectId,
      action: entry.action,
      entityTable: entry.entityTable,
      entityId: entry.entityId,
      before: jsonSafe(entry.before ?? null),
      after: jsonSafe(entry.after ?? null),
      requestId: context?.requestId ?? null,
      ip: context?.ip ?? null,
    });
  } catch (error) {
    logger.error({ err: error, action: entry.action }, 'audit write failed');
  }
}
