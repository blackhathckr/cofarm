import { applyBasisPoints, sumPaise, type Paise } from './money.ts';
import { splitProRata, type ProRataShare } from './share.ts';

export const COST_HEADS = [
  'lease_land',
  'saplings_infra',
  'manure_nutrition',
  'labour_maintenance',
  'misc',
] as const;

export type CostHead = (typeof COST_HEADS)[number];

/**
 * The wording the client's P&L statement uses. Both apps render these heads, so
 * the labels sit with the heads rather than being restated per screen.
 */
export const COST_HEAD_LABELS: Readonly<Record<CostHead, string>> = {
  lease_land: 'Lease and land',
  saplings_infra: 'Saplings and infra',
  manure_nutrition: 'Manure and nutrition',
  labour_maintenance: 'Labour and maintenance',
  misc: 'Miscellaneous',
};

export type CycleParticipant = {
  membershipId: string;
  contributionPaise: Paise;
};

export type CyclePnlInput = {
  grossRevenuePaise: Paise;
  costsByHead: Readonly<Partial<Record<CostHead, Paise>>>;
  /** Share of net proceeds retained by Kiaan. 5000 = 50%. */
  kiaanShareBasisPoints: number;
  participants: readonly CycleParticipant[];
};

export type PartnerShare = {
  membershipId: string;
  contributionPaise: Paise;
  sharePaise: Paise;
};

export type CyclePnl = {
  grossRevenuePaise: Paise;
  costsByHead: Readonly<Partial<Record<CostHead, Paise>>>;
  totalCostPaise: Paise;
  netProceedsPaise: Paise;
  kiaanSharePaise: Paise;
  partnerPoolPaise: Paise;
  partnerShares: PartnerShare[];
};

/**
 * The single place profit-share is computed. Net proceeds split by the agreed
 * basis points, the partner pool then divided pro-rata by contribution.
 *
 * A loss flows through with the same arithmetic: the pool goes negative and
 * each partner carries their proportion of it.
 */
export function computeCyclePnl(input: CyclePnlInput): CyclePnl {
  const totalCostPaise = sumPaise(COST_HEADS.map((head) => input.costsByHead[head] ?? 0n));
  const netProceedsPaise = input.grossRevenuePaise - totalCostPaise;

  // Kiaan's cut is taken from the magnitude so a loss splits in the same
  // proportion as a profit rather than inverting the sign of the remainder.
  const negative = netProceedsPaise < 0n;
  const magnitude = negative ? -netProceedsPaise : netProceedsPaise;
  const kiaanMagnitude = applyBasisPoints(magnitude, input.kiaanShareBasisPoints);

  const kiaanSharePaise = negative ? -kiaanMagnitude : kiaanMagnitude;
  const partnerPoolPaise = netProceedsPaise - kiaanSharePaise;

  const shares: ProRataShare[] = splitProRata(
    partnerPoolPaise,
    input.participants.map((participant) => ({
      key: participant.membershipId,
      weight: participant.contributionPaise,
    })),
  );

  return {
    grossRevenuePaise: input.grossRevenuePaise,
    costsByHead: input.costsByHead,
    totalCostPaise,
    netProceedsPaise,
    kiaanSharePaise,
    partnerPoolPaise,
    partnerShares: shares.map((share) => ({
      membershipId: share.key,
      contributionPaise: share.weight,
      sharePaise: share.amount,
    })),
  };
}

/** Return against money actually put in, in basis points. */
export function returnBasisPoints(contributionPaise: Paise, earnedPaise: Paise): number {
  if (contributionPaise <= 0n) return 0;
  return Number((earnedPaise * 10_000n) / contributionPaise);
}
