import { inArray, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import type { ProjectScope } from '../lib/project-scope.ts';

export function withinScope(scope: ProjectScope, column: PgColumn): SQL {
  if (scope.allProjects) return sql`true`;
  if (scope.projectIds.length === 0) return sql`false`;
  return inArray(column, [...scope.projectIds]);
}
