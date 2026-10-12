import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { fastify, type FastifyInstance } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

import { corsOrigins, env, isProduction } from './lib/env.ts';
import { loggerOptions } from './lib/logger.ts';
import { adminUsersRouter } from './modules/admin-users/admin-users.router.ts';
import { authRouter } from './modules/auth/auth.router.ts';
import { accountRouter } from './modules/account/account.router.ts';
import { dashboardRouter } from './modules/dashboard/dashboard.router.ts';
import { documentsRouter } from './modules/documents/documents.router.ts';
import { harvestRouter, myStatementsRouter } from './modules/harvest/harvest.router.ts';
import { healthRouter } from './modules/health/health.router.ts';
import { jobsRouter } from './modules/jobs/jobs.router.ts';
import { ledgerRouter } from './modules/ledger/ledger.router.ts';
import {
  myThreadsRouter,
  projectThreadRouter,
  threadsRouter,
} from './modules/messaging/messaging.router.ts';
import { misRouter, myMisRouter } from './modules/mis/mis.router.ts';
import {
  devicesRouter,
  notificationsRouter,
} from './modules/notifications/notifications.router.ts';
import { partnersRouter, projectPartnersRouter } from './modules/partners/partners.router.ts';
import { projectsRouter } from './modules/projects/projects.router.ts';
import {
  mySignaturesRouter,
  projectSignaturesRouter,
  signaturesRouter,
} from './modules/signatures/signatures.router.ts';
import { trackingRouter } from './modules/tracking/tracking.router.ts';
import { projectUpdatesRouter } from './modules/updates/updates.router.ts';
import { captureIdempotentResponse } from './middleware/idempotency.ts';
import { registerAuthentication } from './plugins/authenticate.ts';
import { registerErrorHandler } from './plugins/error-handler.ts';
import { registerRequestContext } from './plugins/request-context.ts';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: loggerOptions,
    trustProxy: isProduction,
    ignoreTrailingSlash: true,
    bodyLimit: 1_048_576,
    disableRequestLogging: false,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerRequestContext(app);
  registerErrorHandler(app);

  await app.register(helmet, { contentSecurityPolicy: isProduction });
  await app.register(cors, { origin: corsOrigins(), credentials: true });
  await app.register(rateLimit, { max: env.RATE_LIMIT_PER_MINUTE, timeWindow: '1 minute' });

  registerAuthentication(app);
  app.addHook('onSend', captureIdempotentResponse);

  if (!isProduction) {
    await app.register(swagger, {
      openapi: {
        info: { title: 'CoFarm API', version: '1.0.0' },
        components: {
          securitySchemes: {
            bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
      transform: jsonSchemaTransform,
    });
    await app.register(swaggerUi, { routePrefix: '/docs' });
  }

  await app.register(healthRouter, { prefix: '/health' });
  await app.register(authRouter, { prefix: '/v1/auth' });
  await app.register(projectsRouter, { prefix: '/v1/projects' });
  await app.register(projectPartnersRouter, { prefix: '/v1/projects' });
  await app.register(projectUpdatesRouter, { prefix: '/v1/projects' });
  await app.register(ledgerRouter, { prefix: '/v1/projects' });
  await app.register(harvestRouter, { prefix: '/v1/projects' });
  await app.register(myStatementsRouter, { prefix: '/v1/me/statements' });
  await app.register(misRouter, { prefix: '/v1/projects' });
  await app.register(projectThreadRouter, { prefix: '/v1/projects' });
  await app.register(projectSignaturesRouter, { prefix: '/v1/projects' });
  await app.register(threadsRouter, { prefix: '/v1/threads' });
  await app.register(signaturesRouter, { prefix: '/v1/signatures' });
  await app.register(myThreadsRouter, { prefix: '/v1/me/threads' });
  await app.register(mySignaturesRouter, { prefix: '/v1/me/signatures' });
  await app.register(myMisRouter, { prefix: '/v1/me/mis' });
  await app.register(partnersRouter, { prefix: '/v1/partners' });
  await app.register(documentsRouter, { prefix: '/v1/documents' });
  await app.register(notificationsRouter, { prefix: '/v1/notifications' });
  await app.register(devicesRouter, { prefix: '/v1/me/devices' });
  await app.register(trackingRouter, { prefix: '/v1/tracking' });
  await app.register(jobsRouter, { prefix: '/v1/admin/jobs' });
  await app.register(dashboardRouter, { prefix: '/v1/dashboard' });
  await app.register(accountRouter, { prefix: '/v1/me' });
  await app.register(adminUsersRouter, { prefix: '/v1' });

  app.log.info({ port: env.API_PORT, authProvider: env.AUTH_PROVIDER }, 'app built');
  return app;
}
