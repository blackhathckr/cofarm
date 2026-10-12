import { sql } from 'drizzle-orm';

import { isProduction } from '../lib/env.ts';
import { logger } from '../lib/logger.ts';
import { closeDatabase, db } from './client.ts';

if (isProduction) {
  throw new Error('Refusing to reset a production database');
}

try {
  await db.execute(sql`
    drop schema if exists public cascade;
    drop schema if exists drizzle cascade;
    create schema public;
  `);
  logger.info('schema and migration journal dropped');
} finally {
  await closeDatabase();
}
