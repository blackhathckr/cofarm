import { milestoneTagSchema, type MilestoneTag } from '@cofarm/contracts/updates';

export const MILESTONE_TAG_OPTIONS = milestoneTagSchema.options;

export const MILESTONE_TAG_LABELS: Readonly<Record<MilestoneTag, string>> = {
  land_prep: 'Land prep',
  planting: 'Planting',
  growth: 'Growth',
  irrigation: 'Irrigation',
  nutrition: 'Nutrition',
  disease_mgmt: 'Disease management',
  bunch_formation: 'Bunch formation',
  harvest: 'Harvest',
  general: 'General',
};
