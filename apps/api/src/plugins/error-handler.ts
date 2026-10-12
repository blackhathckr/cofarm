import { ERROR_CODES, type ProblemDetail } from '@cofarm/contracts/errors';
import type { FastifyError, FastifyInstance, FastifySchemaValidationError } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';

import { isProduction } from '../lib/env.ts';
import { AppError } from '../lib/errors.ts';

const PROBLEM_TYPE = 'https://cofarm.farm/problems';

function problem(partial: Omit<ProblemDetail, 'type'>): ProblemDetail {
  return { type: `${PROBLEM_TYPE}/${partial.code}`, ...partial };
}

/**
 * Read from `instancePath` rather than the zod issue the library stashes in
 * `params`, which it does not type — these two fields are part of Fastify's
 * own contract and will not move.
 */
function fieldErrors(
  issues: readonly FastifySchemaValidationError[],
): { path: string; message: string }[] {
  return issues.map((issue) => ({
    path: issue.instancePath.replace(/^\//, '').replaceAll('/', '.'),
    message: issue.message ?? 'Invalid value',
  }));
}

function fromAppError(error: AppError): Omit<ProblemDetail, 'type'> {
  return {
    title: error.message,
    status: error.status,
    code: error.code,
    ...(error.detail === undefined ? {} : { detail: error.detail }),
  };
}

function fromFastifyError(error: FastifyError): Omit<ProblemDetail, 'type'> {
  const status = error.statusCode ?? 500;
  if (status === 429) {
    return { title: 'Too many requests', status, code: ERROR_CODES.rateLimited };
  }
  return {
    title: status >= 500 ? 'Something went wrong' : error.message,
    status,
    code: status >= 500 ? ERROR_CODES.internal : ERROR_CODES.badRequest,
    // The message of a 500 can carry internals, so it is withheld in production.
    ...(isProduction && status >= 500 ? {} : { detail: error.message }),
  };
}

/**
 * The single place an error becomes a response. Every failure leaves the API as
 * RFC 7807 problem+json with a stable `code`, so clients branch on the code and
 * a reworded message is never a breaking change.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    void reply
      .status(404)
      .type('application/problem+json')
      .send(
        problem({
          title: 'Route not found',
          status: 404,
          code: ERROR_CODES.notFound,
          instance: request.url,
          requestId: request.id,
        }),
      );
  });

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const raw: unknown = error;
    let body: Omit<ProblemDetail, 'type'>;

    if (hasZodFastifySchemaValidationErrors(raw)) {
      body = {
        title: 'Request failed validation',
        status: 400,
        code: ERROR_CODES.validationFailed,
        errors: fieldErrors(raw.validation),
      };
    } else if (isResponseSerializationError(raw)) {
      // A response that does not match its own schema is our bug, not the
      // caller's, so it is logged loudly and reported as a 500.
      request.log.error({ err: raw, route: raw.method }, 'response failed its schema');
      body = { title: 'Malformed response', status: 500, code: ERROR_CODES.internal };
    } else if (error instanceof AppError) {
      body = fromAppError(error);
    } else {
      body = fromFastifyError(error);
    }

    if (body.status >= 500 && !isResponseSerializationError(raw)) {
      request.log.error({ err: error }, 'unhandled error');
    } else if (error instanceof AppError) {
      request.log.info({ code: error.code }, error.message);
    }

    void reply
      .status(body.status)
      .type('application/problem+json')
      .send(problem({ ...body, instance: request.url, requestId: request.id }));
  });
}
