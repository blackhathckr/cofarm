import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgres://cofarm:cofarm@localhost:5433/cofarm',
  },
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
