import { isProduction, env } from '../lib/env.ts';
import { logger } from '../lib/logger.ts';
import { closeDatabase } from './client.ts';
import { seedContent } from './demo/content.ts';
import { loadContext, projectOf } from './demo/context.ts';
import { seedFinance } from './demo/finance.ts';
import { seedMessaging } from './demo/messaging.ts';
import { DEMO_PLAN } from './demo/plan.ts';

if (isProduction) {
  throw new Error('Refusing to seed demo data into a production database');
}

/**
 * Layers a cycle's worth of money, reports and conversation on top of
 * `db:seed`, so the P&L, MIS and chat screens have something to show in a
 * walkthrough. Kept separate because the end-to-end flows assert counts
 * against the base seed and must not see these rows.
 */
try {
  const context = await loadContext(env.SEED_ADMIN_EMAIL);

  for (const plan of DEMO_PLAN) {
    const project = projectOf(context, plan.code);
    const finance = await seedFinance(context, project, plan);
    const content = await seedContent(context, project, plan);
    const messaging = await seedMessaging(context, project, plan);

    logger.info({ project: plan.code, ...finance, ...content, ...messaging }, 'demo data seeded');
  }

  logger.info({ projects: DEMO_PLAN.map((plan) => plan.code) }, 'demo seed complete');
} catch (error) {
  logger.error({ err: error }, 'demo seed failed');
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
