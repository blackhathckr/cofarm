import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { logger } from '../lib/logger.ts';
import { closeDatabase, db } from './client.ts';

const migrationsFolder = fileURLToPath(new URL('migrations', import.meta.url));

try {
  await migrate(db, { migrationsFolder });
  logger.info('migrations applied');
} catch (error) {
  logger.error({ err: error }, 'migration failed');
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
