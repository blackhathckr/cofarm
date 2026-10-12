import {
  contributionPageSchema,
  expensePageSchema,
  ledgerEntryParamsSchema,
  ledgerEntrySchema,
  ledgerSummaryQuerySchema,
  ledgerSummarySchema,
  listContributionsQuerySchema,
  listExpensesQuerySchema,
  recordContributionBodySchema,
  recordExpenseBodySchema,
  recordRevenueBodySchema,
  reverseContributionBodySchema,
  reverseExpenseBodySchema,
} from '@cofarm/contracts/ledger';
import { projectIdParamsSchema } from '@cofarm/contracts/projects';

export const ledgerSchemas = {
  recordExpense: {
    params: projectIdParamsSchema,
    body: recordExpenseBodySchema,
    response: { 201: ledgerEntrySchema },
  },
  listExpenses: {
    params: projectIdParamsSchema,
    querystring: listExpensesQuerySchema,
    response: { 200: expensePageSchema },
  },
  reverseExpense: {
    params: ledgerEntryParamsSchema,
    body: reverseExpenseBodySchema,
    response: { 201: ledgerEntrySchema },
  },
  recordContribution: {
    params: projectIdParamsSchema,
    body: recordContributionBodySchema,
    response: { 201: ledgerEntrySchema },
  },
  listContributions: {
    params: projectIdParamsSchema,
    querystring: listContributionsQuerySchema,
    response: { 200: contributionPageSchema },
  },
  reverseContribution: {
    params: ledgerEntryParamsSchema,
    body: reverseContributionBodySchema,
    response: { 201: ledgerEntrySchema },
  },
  recordRevenue: {
    params: projectIdParamsSchema,
    body: recordRevenueBodySchema,
    response: { 201: ledgerEntrySchema },
  },
  summary: {
    params: projectIdParamsSchema,
    querystring: ledgerSummaryQuerySchema,
    response: { 200: ledgerSummarySchema },
  },
} as const;
