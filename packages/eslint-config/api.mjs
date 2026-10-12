const DB = ['**/db/client*', '**/db/schema*', '**/db/scoped*', '**/db/migrate*', '**/db/seed*'];
const OWN_REPO = ['./*.repo', './*.repo.ts'];
const ANY_REPO = ['**/*.repo', '**/*.repo.ts'];
const FOREIGN_REPO = ['../*/*.repo', '../*/*.repo.ts'];
const OWN_SERVICE = ['./*.service', './*.service.ts'];
const FOREIGN_SERVICE = ['../*/*.service', '../*/*.service.ts'];
const OWN_CONTROLLER = ['./*.controller', './*.controller.ts'];
const OWN_ROUTER = ['./*.router', './*.router.ts'];
const MODULES = ['**/modules/**'];
const FASTIFY = ['fastify', 'fastify/*'];

const VENDOR = ['@aws-sdk/*', 'firebase-admin', 'firebase-admin/*', 'nodemailer', 'pg'];

const layer = (glob, groups, message) => ({
  files: [`apps/api/src/${glob}`],
  rules: {
    'no-restricted-imports': ['error', { patterns: [{ group: groups, message }] }],
  },
});

export function api() {
  return [
    layer(
      'modules/*/*.controller.ts',
      [...OWN_REPO, ...FOREIGN_REPO, ...DB, ...VENDOR],
      'A controller calls its service. Data access belongs to the repo.',
    ),
    layer(
      'modules/*/*.service.ts',
      [...FASTIFY, ...FOREIGN_REPO, ...DB, ...OWN_CONTROLLER, ...OWN_ROUTER, ...VENDOR],
      'A service owns business rules only: no HTTP types, no SQL, and no other module’s repo — reach other modules through their service.',
    ),
    layer(
      'modules/*/*.repo.ts',
      [...FASTIFY, ...OWN_SERVICE, ...FOREIGN_SERVICE, ...OWN_CONTROLLER, ...VENDOR],
      'A repo holds queries only. Business rules live in the service.',
    ),
    layer(
      'modules/*/*.router.ts',
      [...OWN_REPO, ...OWN_SERVICE, ...DB, ...VENDOR],
      'A router is a route table: hooks and a controller, nothing else.',
    ),
    layer(
      'modules/*/*.validation.ts',
      [...OWN_REPO, ...OWN_SERVICE, ...OWN_CONTROLLER, ...FASTIFY, ...DB, ...VENDOR],
      'Validation holds schemas only.',
    ),
    layer(
      'modules/*/*.types.ts',
      [...OWN_REPO, ...OWN_SERVICE, ...OWN_CONTROLLER, ...DB, ...VENDOR],
      'Module types are declarations only.',
    ),
    layer(
      'lib/*.ts',
      [...FASTIFY, ...DB, ...MODULES, ...VENDOR],
      'lib is leaf-level: no framework, no database, no modules, no vendor SDKs.',
    ),
    layer(
      'db/**/*.ts',
      [...FASTIFY, ...MODULES],
      'The database layer knows nothing about HTTP or modules.',
    ),
    layer(
      'infra/*.ts',
      [...FASTIFY, ...DB, ...MODULES],
      'An infra adapter wraps one external system and nothing of ours beyond lib.',
    ),
    layer(
      'plugins/*.ts',
      [...DB, ...ANY_REPO, ...VENDOR],
      'A plugin reaches data through a service.',
    ),
    layer(
      'middleware/*.ts',
      [...DB, ...ANY_REPO, ...VENDOR],
      'Middleware reaches data through a service.',
    ),
    layer(
      'jobs/*.ts',
      [...FASTIFY, ...DB, ...ANY_REPO, ...VENDOR],
      'A job handler calls a service, so the same rule runs from HTTP and from the queue.',
    ),
    layer(
      'app.ts',
      [...ANY_REPO, ...DB, ...VENDOR],
      'Composition only: plugins, middleware and routers.',
    ),
    // main.ts owns the process, and that includes closing the connection pool
    // on shutdown, so db/client is reachable here and nowhere else above it.
    layer(
      'main.ts',
      [...ANY_REPO, '**/db/schema*', '**/db/scoped*', ...MODULES, ...VENDOR],
      'main.ts starts and stops the process. Everything else belongs in app.ts.',
    ),
  ];
}
