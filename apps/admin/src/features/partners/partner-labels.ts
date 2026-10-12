import type { PartnerBadge } from '@cofarm/contracts/partners';

export const PARTNER_BADGE_LABELS: Record<PartnerBadge, string> = {
  active: 'Active',
  sign_pending: 'Sign pending',
  onboarding: 'Onboarding',
};

export const PARTNER_BADGE_VARIANTS: Record<PartnerBadge, 'default' | 'destructive' | 'outline'> = {
  active: 'default',
  sign_pending: 'destructive',
  onboarding: 'outline',
};
