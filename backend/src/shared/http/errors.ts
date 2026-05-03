export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UPSTREAM_TIMEOUT'
  | 'INTERNAL';

const STATUS: Record<ErrorCode, number> = {
    BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UPSTREAM_TIMEOUT: 504,
  INTERNAL: 500,
}

export class AppError extends Error {
    constructor(
        public readonly code: ErrorCode,
        message: string,
        public readonly details?: unknown,
    )
    {
        super(message);
        this.name = 'AppError';
    }
    get httpStatus() {
        return STATUS[this.code];
    }
}