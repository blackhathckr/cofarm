import { pgEnum } from 'drizzle-orm/pg-core';

export const userKind = pgEnum('user_kind', ['partner', 'admin']);
export const userStatus = pgEnum('user_status', ['active', 'suspended', 'deleted']);

export const projectStatus = pgEnum('project_status', ['planned', 'active', 'harvested', 'closed']);
export const cycleStatus = pgEnum('cycle_status', ['planned', 'active', 'harvested', 'closed']);

export const milestoneStage = pgEnum('milestone_stage', [
  'land_prep',
  'planting',
  'growth',
  'bunch_formation',
  'harvest',
]);
export const milestoneStatus = pgEnum('milestone_status', ['done', 'active', 'upcoming']);
export const milestoneTag = pgEnum('milestone_tag', [
  'land_prep',
  'planting',
  'growth',
  'irrigation',
  'nutrition',
  'disease_mgmt',
  'bunch_formation',
  'harvest',
  'general',
]);

export const membershipStatus = pgEnum('membership_status', ['active', 'exited']);
export const agreementStatus = pgEnum('agreement_status', ['not_sent', 'sent', 'signed']);
export const shareBasis = pgEnum('share_basis', ['pro_rata_contribution', 'fixed_pct']);

export const ledgerType = pgEnum('ledger_type', [
  'contribution',
  'expense',
  'revenue',
  'payout',
  'adjustment',
]);
export const costHead = pgEnum('cost_head', [
  'lease_land',
  'saplings_infra',
  'manure_nutrition',
  'labour_maintenance',
  'misc',
]);

export const publishStatus = pgEnum('publish_status', ['draft', 'published']);
export const misSource = pgEnum('mis_source', ['generated', 'uploaded']);

export const documentType = pgEnum('document_type', [
  'mis_report',
  'agreement',
  'statement',
  'weighment_slip',
  'harvest_photo',
  'update_photo',
  'partner_document',
  'other',
]);

export const signatureStatus = pgEnum('signature_status', [
  'pending',
  'signed',
  'declined',
  'cancelled',
]);

export const threadStatus = pgEnum('thread_status', ['open', 'resolved']);

export const notificationType = pgEnum('notification_type', [
  'mis_published',
  'update_published',
  'harvest_published',
  'message_received',
  'document_issued',
  'reminder',
]);

export const harvestDocumentKind = pgEnum('harvest_document_kind', [
  'weighment_slip',
  'harvest_photo',
]);

export const devicePlatform = pgEnum('device_platform', ['ios', 'android']);

export const jobStatus = pgEnum('job_status', ['pending', 'running', 'done', 'failed']);

export const entityType = pgEnum('entity_type', [
  'mis_report',
  'project_update',
  'partner_statement',
  'harvest',
  'message',
  'document',
]);
