/**
 * A crop cycle runs through a fixed sequence of stages. The partner app shows
 * a completion percentage, so the stages carry weights: they are not equal in
 * duration and an evenly divided bar would misreport where a cycle stands.
 */

export const MILESTONE_STAGES = [
  'land_prep',
  'planting',
  'growth',
  'bunch_formation',
  'harvest',
] as const;

export type MilestoneStage = (typeof MILESTONE_STAGES)[number];

export const MILESTONE_LABELS: Readonly<Record<MilestoneStage, string>> = {
  land_prep: 'Land preparation',
  planting: 'Planting',
  growth: 'Growth',
  bunch_formation: 'Bunch formation',
  harvest: 'Harvest',
};

const STAGE_WEIGHTS: Readonly<Record<MilestoneStage, number>> = {
  land_prep: 8,
  planting: 7,
  growth: 55,
  bunch_formation: 20,
  harvest: 10,
};

export const MILESTONE_TAGS = [
  'land_prep',
  'planting',
  'growth',
  'irrigation',
  'nutrition',
  'disease_mgmt',
  'bunch_formation',
  'harvest',
  'general',
] as const;

export type MilestoneTag = (typeof MILESTONE_TAGS)[number];

export const MILESTONE_TAG_LABELS: Readonly<Record<MilestoneTag, string>> = {
  land_prep: 'Land prep',
  planting: 'Planting',
  growth: 'Growth',
  irrigation: 'Irrigation',
  nutrition: 'Nutrition',
  disease_mgmt: 'Disease mgmt',
  bunch_formation: 'Bunch formation',
  harvest: 'Harvest',
  general: 'General',
};

export type MilestoneStatus = 'done' | 'active' | 'upcoming';

export type CycleMilestone = {
  stage: MilestoneStage;
  status: MilestoneStatus;
};

/**
 * Completed stages count in full; the active stage counts half, because we know
 * it has started but not how far along it is. Reported as basis points to stay
 * integer end to end.
 */
export function cycleProgressBasisPoints(milestones: readonly CycleMilestone[]): number {
  const totalWeight = MILESTONE_STAGES.reduce((sum, stage) => sum + STAGE_WEIGHTS[stage], 0);
  if (totalWeight === 0) return 0;

  const earned = milestones.reduce((sum, milestone) => {
    const weight = STAGE_WEIGHTS[milestone.stage];
    if (milestone.status === 'done') return sum + weight;
    if (milestone.status === 'active') return sum + weight / 2;
    return sum;
  }, 0);

  return Math.round((earned / totalWeight) * 10_000);
}

export function activeStage(milestones: readonly CycleMilestone[]): MilestoneStage | null {
  return milestones.find((milestone) => milestone.status === 'active')?.stage ?? null;
}
