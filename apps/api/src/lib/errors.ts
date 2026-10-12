import { ERROR_CODES, type ErrorCode } from '@cofarm/contracts/errors';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly detail: string | undefined;
  readonly meta: Readonly<Record<string, unknown>> | undefined;

  constructor(
    code: ErrorCode,
    status: number,
    message: string,
    options: { detail?: string; meta?: Record<string, unknown>; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.detail = options.detail;
    this.meta = options.meta;
  }
}

export function badRequest(message: string, detail?: string): AppError {
  return new AppError(ERROR_CODES.badRequest, 400, message, detail === undefined ? {} : { detail });
}

export function unauthorized(message = 'Authentication required'): AppError {
  return new AppError(ERROR_CODES.unauthorized, 401, message);
}

export function notFound(what: string): AppError {
  return new AppError(ERROR_CODES.notFound, 404, `${what} not found`);
}

export function forbidden(message = 'Not permitted'): AppError {
  return new AppError(ERROR_CODES.forbidden, 403, message);
}

export function conflict(code: ErrorCode, message: string, detail?: string): AppError {
  return new AppError(code, 409, message, detail === undefined ? {} : { detail });
}

export function unprocessable(code: ErrorCode, message: string, detail?: string): AppError {
  return new AppError(code, 422, message, detail === undefined ? {} : { detail });
}
