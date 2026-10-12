import { sql } from 'drizzle-orm';

import { isProduction } from '../lib/env.ts';
import { logger } from '../lib/logger.ts';
import { closeDatabase, db } from './client.ts';

if (isProduction) {
  throw new Error('Refusing to truncate a production database');
}

/** Empties every table, leaving the schema, enum types and migration journal. */
try {
  const tables = await db.execute<{ name: string }>(sql`
    select quote_ident(tablename) as name
    from pg_tables
    where schemaname = 'public' and tablename <> '__drizzle_migrations'
  `);

  const names = tables.rows.map((row) => row.name);
  if (names.length > 0) {
    await db.execute(sql.raw(`truncate table ${names.join(', ')} restart identity cascade`));
  }
  logger.info({ tables: names.length }, 'tables truncated');
} finally {
  await closeDatabase();
}
