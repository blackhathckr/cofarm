/**
 * Stable machine-readable codes. Clients switch on these, never on the
 * message, so a reworded message is never a breaking change.
 */
export const ERROR_CODES = {
  badRequest: 'bad_request',
  validationFailed: 'validation_failed',
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  notFound: 'not_found',
  rateLimited: 'rate_limited',
  internal: 'internal_error',

  otpInvalid: 'otp_invalid',
  otpExpired: 'otp_expired',
  otpLocked: 'otp_locked',
  credentialsInvalid: 'credentials_invalid',
  twoFactorRequired: 'two_factor_required',
  twoFactorInvalid: 'two_factor_invalid',
  tokenExpired: 'token_expired',

  noActiveMembership: 'no_active_membership',
  projectCodeTaken: 'project_code_taken',
  partnerMobileTaken: 'partner_mobile_taken',
  membershipExists: 'membership_exists',
  emailTaken: 'email_taken',
  roleKeyTaken: 'role_key_taken',
  roleIsSystem: 'role_is_system',
  roleInUse: 'role_in_use',
  lastSuperadmin: 'last_superadmin',
  cycleNotOpen: 'cycle_not_open',
  cycleHasRecords: 'cycle_has_records',
  harvestAlreadyPublished: 'harvest_already_published',
  harvestExists: 'harvest_exists',
  payoutsAlreadyRecorded: 'payouts_already_recorded',
  misPeriodExists: 'mis_period_exists',
  misDocumentMissing: 'mis_document_missing',
  alreadyPublished: 'already_published',
  notPublished: 'not_published',
  ledgerImmutable: 'ledger_immutable',
  signatureAlreadySettled: 'signature_already_settled',
  idempotencyMismatch: 'idempotency_mismatch',
  uploadIncomplete: 'upload_incomplete',
  documentReferenced: 'document_referenced',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** RFC 7807 problem detail, as every failing response is shaped. */
export type ProblemDetail = {
  type: string;
  title: string;
  status: number;
  code: ErrorCode;
  detail?: string;
  instance?: string;
  requestId?: string;
  errors?: { path: string; message: string }[];
};
