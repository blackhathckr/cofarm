import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { env } from '../lib/env.ts';
import * as schema from './schema.ts';

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool, { schema, casing: 'snake_case' });

export type Database = typeof db;

export type Querier = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

export async function closeDatabase(): Promise<void> {
  await pool.end();
}

export async function pingDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('select 1');
  } finally {
    client.release();
  }
}
