import type { DocumentType } from '@cofarm/contracts/documents';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  mis_report: 'MIS report',
  agreement: 'Agreement',
  statement: 'Statement',
  weighment_slip: 'Weighment slip',
  harvest_photo: 'Harvest photo',
  update_photo: 'Update photo',
  partner_document: 'Partner document',
  other: 'Correspondence or other',
};

/** What an admin files against a partner: the signed agreement, statements and
 * correspondence the partner-accounts scope names. */
export const PARTNER_UPLOAD_TYPES: readonly DocumentType[] = [
  'agreement',
  'statement',
  'partner_document',
  'other',
];
