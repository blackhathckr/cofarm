import {
  accountDeletionResultSchema,
  accountProfileSchema,
  deleteAccountBodySchema,
  deletionPolicySchema,
  updateProfileBodySchema,
} from '@cofarm/contracts/account';

export const accountSchemas = {
  getProfile: {
    response: { 200: accountProfileSchema },
  },
  updateProfile: {
    body: updateProfileBodySchema,
    response: { 200: accountProfileSchema },
  },
  deleteAccount: {
    body: deleteAccountBodySchema,
    response: { 200: accountDeletionResultSchema },
  },
  deletionPolicy: {
    response: { 200: deletionPolicySchema },
  },
} as const;
