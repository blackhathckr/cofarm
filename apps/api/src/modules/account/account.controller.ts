import type {
  AccountDeletionResult,
  AccountProfile,
  DeleteAccountBody,
  DeletionPolicy,
  UpdateProfileBody,
} from '@cofarm/contracts/account';
import type { FastifyRequest } from 'fastify';

import { assertActor, type Actor } from '../../lib/actor.ts';
import { assertScope } from '../../lib/project-scope.ts';

import type { AccountCaller } from './account.service.ts';
import * as service from './account.service.ts';

export async function getProfile(request: FastifyRequest): Promise<AccountProfile> {
  return service.getProfile(assertScope(request.scope), callerOf(request));
}

export async function updateProfile(
  request: FastifyRequest<{ Body: UpdateProfileBody }>,
): Promise<AccountProfile> {
  return service.updateProfile(assertScope(request.scope), callerOf(request), request.body);
}

export async function deleteAccount(
  request: FastifyRequest<{ Body: DeleteAccountBody }>,
): Promise<AccountDeletionResult> {
  return service.deleteAccount(assertScope(request.scope), callerOf(request), request.body);
}

export function deletionPolicy(): DeletionPolicy {
  return service.deletionPolicy();
}

function callerOf(request: FastifyRequest): AccountCaller {
  const actor: Actor = assertActor(request.actor);
  return { userId: actor.userId, kind: actor.kind, isSuperadmin: actor.isSuperadmin };
}
