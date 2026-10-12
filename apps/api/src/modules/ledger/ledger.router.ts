import { PERMISSIONS } from '@cofarm/contracts/permissions';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { requirePermission } from '../../middleware/authorize.ts';
import { requireProjectInScope } from '../../middleware/project-scope.ts';
import * as controller from './ledger.controller.ts';
import { requireExpenseRead } from './ledger.guard.ts';
import { ledgerSchemas } from './ledger.validation.ts';

/** Registered under the projects prefix: every path hangs off one project. */
export const ledgerRouter: FastifyPluginAsyncZod = (app) => {
  app.post('/:projectId/expenses', {
    schema: ledgerSchemas.recordExpense,
    preValidation: requirePermission(PERMISSIONS.expenseWrite),
    handler: controller.recordExpense,
  });

  app.get('/:projectId/expenses', {
    schema: ledgerSchemas.listExpenses,
    preValidation: [requireProjectInScope, requireExpenseRead],
    handler: controller.listExpenses,
  });

  app.post('/:projectId/expenses/:entryId/reverse', {
    schema: ledgerSchemas.reverseExpense,
    preValidation: requirePermission(PERMISSIONS.expenseWrite),
    handler: controller.reverseExpense,
  });

  app.post('/:projectId/contributions', {
    schema: ledgerSchemas.recordContribution,
    preValidation: requirePermission(PERMISSIONS.expenseWrite),
    handler: controller.recordContribution,
  });

  app.get('/:projectId/contributions', {
    schema: ledgerSchemas.listContributions,
    preValidation: [requireProjectInScope, requireExpenseRead],
    handler: controller.listContributions,
  });

  app.post('/:projectId/contributions/:entryId/reverse', {
    schema: ledgerSchemas.reverseContribution,
    preValidation: requirePermission(PERMISSIONS.expenseWrite),
    handler: controller.reverseContribution,
  });

  app.post('/:projectId/revenue', {
    schema: ledgerSchemas.recordRevenue,
    preValidation: requirePermission(PERMISSIONS.expenseWrite),
    handler: controller.recordRevenue,
  });

  app.get('/:projectId/ledger/summary', {
    schema: ledgerSchemas.summary,
    preValidation: requireProjectInScope,
    handler: controller.summary,
  });

  return Promise.resolve();
};
