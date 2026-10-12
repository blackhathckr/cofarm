import { buildApp } from './app.ts';
import { closeDatabase } from './db/client.ts';
import { armDocumentSweep } from './jobs/document-sweep.job.ts';
import { startWorker, stopWorker } from './jobs/worker.ts';
import { env } from './lib/env.ts';
import { logger } from './lib/logger.ts';

const app = await buildApp();

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'shutting down');
  try {
    await stopWorker();
    await app.close();
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'shutdown failed');
    process.exit(1);
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}

try {
  await app.listen({ port: env.API_PORT, host: env.API_HOST });
  startWorker();
  // Nothing else seeds the first run, and the chain only re-arms on success.
  await armDocumentSweep();
} catch (error) {
  // Written synchronously as well: pino's dev transport is async, and exiting
  // on a startup failure can drop the only explanation of why.
  process.stderr.write(
    `cofarm api failed to start on ${env.API_HOST}:${env.API_PORT.toString()} — ${
      error instanceof Error ? error.message : String(error)
    }
`,
  );
  logger.error({ err: error }, 'failed to start');
  await closeDatabase();
  process.exitCode = 1;
}
