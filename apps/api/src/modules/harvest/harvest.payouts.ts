import type { PayoutResult, RecordPayoutsBody } from '@cofarm/contracts/harvest';
import { ERROR_CODES } from '@cofarm/contracts/errors';
import { toPaiseString } from '@cofarm/contracts/primitives';
import { sumPaise } from '@cofarm/core/money';

import { conflict, notFound } from '../../lib/errors.ts';
import { ADMIN_SCOPE } from '../../lib/project-scope.ts';
import * as audit from '../audit/audit.service.ts';
import * as ledger from '../ledger/ledger.service.ts';

import * as repo from './harvest.repo.ts';

export async function recordPayouts(
  projectId: string,
  harvestId: string,
  input: RecordPayoutsBody,
): Promise<PayoutResult> {
  const harvest = await repo.findHarvest(ADMIN_SCOPE, projectId, harvestId);
  if (harvest === null) throw notFound('Harvest');
  if (harvest.status !== 'published') {
    throw conflict(
      ERROR_CODES.notPublished,
      'Publish the harvest before recording payouts',
      'Statements are what a payout is paid against.',
    );
  }

  // The idempotency key only stops a repeated request, not a fresh one, so the
  // ledger itself decides whether this cycle has already been paid.
  const { paidOutPaise } = await ledger.payoutTotalsByCycle(projectId, harvest.cycleId);
  if (paidOutPaise !== 0n) {
    throw conflict(
      ERROR_CODES.payoutsAlreadyRecorded,
      `Cycle ${harvest.cycleNo} already has payouts recorded`,
      'Post a ledger adjustment if a payout needs correcting.',
    );
  }

  const statements = await repo.statementsForCycle(ADMIN_SCOPE, projectId, harvest.cycleId);
  const payable = statements.filter((statement) => statement.sharePaise > 0n);

  for (const statement of payable) {
    await ledger.recordPayout({
      projectId,
      cycleId: harvest.cycleId,
      membershipId: statement.membershipId,
      amountPaise: statement.sharePaise,
      entryDate: input.entryDate,
      ...(input.note === undefined
        ? { note: `Cycle ${harvest.cycleNo} profit share` }
        : { note: input.note }),
    });
  }

  const totalPaise = sumPaise(payable.map((statement) => statement.sharePaise));
  await audit.record({
    action: 'payout.recorded',
    entityTable: 'partner_statements',
    entityId: harvestId,
    projectId,
    after: {
      cycleId: harvest.cycleId,
      cycleNo: harvest.cycleNo,
      entryDate: input.entryDate,
      recordedCount: payable.length,
      totalPaise: toPaiseString(totalPaise),
    },
  });

  return {
    cycleId: harvest.cycleId,
    recordedCount: payable.length,
    totalPaise: toPaiseString(totalPaise),
  };
}
