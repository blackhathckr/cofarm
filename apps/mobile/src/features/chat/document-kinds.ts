import type { DocumentType } from '@cofarm/contracts/documents';

export type DocumentKind = {
  type: DocumentType;
  title: string;
};

/**
 * Field photographs (`harvest_photo`, `update_photo`) are deliberately absent:
 * they are browsed in the project gallery, and they would bury the handful of
 * documents a partner comes here to find.
 */
export const LIBRARY_DOCUMENT_KINDS: readonly DocumentKind[] = [
  { type: 'agreement', title: 'Your agreement' },
  { type: 'statement', title: 'Statements' },
  { type: 'mis_report', title: 'Monthly reports' },
  { type: 'weighment_slip', title: 'Weighment slips' },
  { type: 'partner_document', title: 'Shared with you' },
  { type: 'other', title: 'Other documents' },
];
