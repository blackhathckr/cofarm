import * as repo from './health.repo.ts';

export type Readiness = {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
};

/**
 * Liveness is "the process answers"; readiness additionally requires the
 * database, because an instance that cannot read its own data should be taken
 * out of rotation rather than serve errors.
 */
export async function readiness(): Promise<Readiness> {
  try {
    await repo.ping();
    return { status: 'ok', database: 'up' };
  } catch {
    return { status: 'degraded', database: 'down' };
  }
}
