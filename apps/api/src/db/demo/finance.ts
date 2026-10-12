import { newId } from '@cofarm/core/id';
import { rupeesToPaise, sumPaise, type Paise } from '@cofarm/core/money';
import { computeCyclePnl, type CostHead } from '@cofarm/core/pnl';

import { db } from '../client.ts';
import { harvestDocuments, harvests, ledgerEntries, partnerStatements } from '../schema.ts';
import { createDocument } from './assets.ts';
import { memberOf, type DemoContext, type DemoProject } from './context.ts';
import type { ProjectPlan } from './plan.ts';

const KIAAN_SHARE_BPS = 5000;

export type FinanceResult = { entries: number; statements: number };

export async function seedFinance(
  context: DemoContext,
  project: DemoProject,
  plan: ProjectPlan,
): Promise<FinanceResult> {
  let entries = 0;

  for (const contribution of plan.contributions) {
    const member = memberOf(project, contribution.partner);
    await db.insert(ledgerEntries).values({
      id: newId(),
      projectId: project.projectId,
      cycleId: null,
      membershipId: member.membershipId,
      type: 'contribution',
      amountPaise: rupeesToPaise(contribution.rupees),
      entryDate: contribution.on,
      note: `Capital contribution, cycle ${project.cycleNo.toString()}`,
      createdBy: context.adminUserId,
    });
    entries += 1;
  }

  for (const expense of plan.expenses) {
    await db.insert(ledgerEntries).values({
      id: newId(),
      projectId: project.projectId,
      cycleId: project.cycleId,
      type: 'expense',
      costHead: expense.head,
      amountPaise: rupeesToPaise(expense.rupees),
      entryDate: expense.on,
      note: expense.note,
      createdBy: context.adminUserId,
    });
    entries += 1;
  }

  if (plan.harvest === undefined) return { entries, statements: 0 };

  const costsByHead = totalsByHead(plan);
  const pricePerKgPaise = rupeesToPaise(plan.harvest.pricePerKgRupees);
  const grossRevenuePaise =
    (BigInt(Math.round(Number(plan.harvest.yieldKg) * 100)) * pricePerKgPaise) / 100n;

  const pnl = computeCyclePnl({
    grossRevenuePaise,
    costsByHead,
    kiaanShareBasisPoints: KIAAN_SHARE_BPS,
    participants: plan.contributions.map((contribution) => ({
      membershipId: memberOf(project, contribution.partner).membershipId,
      contributionPaise: rupeesToPaise(contribution.rupees),
    })),
  });

  const harvestId = newId();
  await db.insert(harvests).values({
    id: harvestId,
    projectId: project.projectId,
    cycleId: project.cycleId,
    yieldKg: plan.harvest.yieldKg,
    varietySplit: plan.harvest.varietySplit,
    pricePerKgPaise,
    buyer: plan.harvest.buyer,
    grossRevenuePaise,
    harvestedOn: plan.harvest.harvestedOn,
    status: 'published',
    publishedAt: new Date(`${plan.harvest.harvestedOn}T12:00:00Z`),
    createdBy: context.adminUserId,
  });

  await attachHarvestDocuments(project, harvestId, plan.harvest.photos);

  await db.insert(ledgerEntries).values({
    id: newId(),
    projectId: project.projectId,
    cycleId: project.cycleId,
    type: 'revenue',
    amountPaise: grossRevenuePaise,
    entryDate: plan.harvest.harvestedOn,
    note: `Cycle ${project.cycleNo.toString()} harvest sold to ${plan.harvest.buyer}`,
    createdBy: context.adminUserId,
  });
  entries += 1;

  for (const share of pnl.partnerShares) {
    const statementId = newId();
    const partner = project.members.find((member) => member.membershipId === share.membershipId);

    const documentId = await createDocument({
      projectId: project.projectId,
      type: 'statement',
      kind: 'statement',
      originalName: `statement-${project.code}-cycle-${project.cycleNo.toString()}.pdf`,
      title: `${project.code} cycle ${project.cycleNo.toString()} statement, ${partner?.name ?? 'partner'}`,
      uploadedBy: context.adminUserId,
      ownerUserId: partner?.userId ?? null,
    });

    await db.insert(partnerStatements).values({
      id: statementId,
      projectId: project.projectId,
      cycleId: project.cycleId,
      membershipId: share.membershipId,
      grossRevenuePaise: pnl.grossRevenuePaise,
      totalCostPaise: pnl.totalCostPaise,
      netProceedsPaise: pnl.netProceedsPaise,
      kiaanSharePaise: pnl.kiaanSharePaise,
      partnerPoolPaise: pnl.partnerPoolPaise,
      sharePaise: share.sharePaise,
      contributionPaise: share.contributionPaise,
      cumulativeSharePaise: share.sharePaise,
      costsByHead: Object.fromEntries(
        Object.entries(pnl.costsByHead).map(([head, amount]) => [head, amount.toString()]),
      ),
      kiaanShareBps: KIAAN_SHARE_BPS,
      cycleNo: project.cycleNo,
      documentId,
    });

    await db.insert(ledgerEntries).values({
      id: newId(),
      projectId: project.projectId,
      cycleId: project.cycleId,
      membershipId: share.membershipId,
      type: 'payout',
      amountPaise: share.sharePaise,
      entryDate: plan.harvest.paidOutOn,
      note: `Cycle ${project.cycleNo.toString()} profit share disbursed`,
      createdBy: context.adminUserId,
    });
    entries += 1;
  }

  return { entries, statements: pnl.partnerShares.length };
}

function totalsByHead(plan: ProjectPlan): Readonly<Partial<Record<CostHead, Paise>>> {
  const totals = new Map<CostHead, Paise[]>();
  for (const expense of plan.expenses) {
    totals.set(expense.head, [...(totals.get(expense.head) ?? []), rupeesToPaise(expense.rupees)]);
  }
  return Object.fromEntries([...totals].map(([head, amounts]) => [head, sumPaise(amounts)]));
}

async function attachHarvestDocuments(
  project: DemoProject,
  harvestId: string,
  photos: number,
): Promise<void> {
  const slipId = await createDocument({
    projectId: project.projectId,
    type: 'weighment_slip',
    kind: 'weighment_slip',
    originalName: `weighment-${project.code}.pdf`,
    title: `${project.code} weighment slips`,
    uploadedBy: null,
    ownerUserId: null,
  });
  await db.insert(harvestDocuments).values({
    id: newId(),
    projectId: project.projectId,
    harvestId,
    documentId: slipId,
    kind: 'weighment_slip',
    sortOrder: 0,
  });

  for (let index = 0; index < photos; index += 1) {
    const photoId = await createDocument({
      projectId: project.projectId,
      type: 'harvest_photo',
      kind: 'harvest_photo',
      originalName: `harvest-${(index + 1).toString()}.jpg`,
      title: `${project.code} harvest photo ${(index + 1).toString()}`,
      uploadedBy: null,
      ownerUserId: null,
    });
    await db.insert(harvestDocuments).values({
      id: newId(),
      projectId: project.projectId,
      harvestId,
      documentId: photoId,
      kind: 'harvest_photo',
      sortOrder: index,
    });
  }
}
