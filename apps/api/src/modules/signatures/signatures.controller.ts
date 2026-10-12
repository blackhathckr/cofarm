import type {
  IssueSignatureBody,
  ListSignaturesQuery,
  MySignatureRequest,
  RemindAllBody,
  RemindAllResult,
  SignaturePage,
  SignatureRequest,
  SignSignatureBody,
} from '@cofarm/contracts/signatures';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { assertActor } from '../../lib/actor.ts';
import { assertScope } from '../../lib/project-scope.ts';

import * as service from './signatures.service.ts';

type ProjectParams = { projectId: string };
type RequestParams = { requestId: string };

export async function issue(
  request: FastifyRequest<{ Params: ProjectParams; Body: IssueSignatureBody }>,
  reply: FastifyReply,
): Promise<SignatureRequest> {
  const issued = await service.issueSignature(
    assertScope(request.scope),
    request.params.projectId,
    request.body,
  );
  void reply.status(201);
  return issued;
}

export async function list(
  request: FastifyRequest<{ Querystring: ListSignaturesQuery }>,
): Promise<SignaturePage> {
  return service.listSignatures(assertScope(request.scope), request.query);
}

export async function remind(
  request: FastifyRequest<{ Params: RequestParams }>,
): Promise<SignatureRequest> {
  return service.remindSignature(assertScope(request.scope), request.params.requestId);
}

export async function remindAll(
  request: FastifyRequest<{ Body: RemindAllBody }>,
): Promise<RemindAllResult> {
  return service.remindAllSignatures(assertScope(request.scope), request.body.projectId);
}

export async function cancel(
  request: FastifyRequest<{ Params: RequestParams }>,
): Promise<SignatureRequest> {
  return service.cancelSignature(assertScope(request.scope), request.params.requestId);
}

export async function mine(request: FastifyRequest): Promise<MySignatureRequest[]> {
  const actor = assertActor(request.actor);
  return service.listMySignatures(assertScope(request.scope), actor.userId);
}

export async function sign(
  request: FastifyRequest<{ Params: RequestParams; Body: SignSignatureBody }>,
): Promise<MySignatureRequest> {
  const actor = assertActor(request.actor);
  return service.signSignature({
    scope: assertScope(request.scope),
    userId: actor.userId,
    requestId: request.params.requestId,
    body: request.body,
    signedIp: request.ip,
  });
}
