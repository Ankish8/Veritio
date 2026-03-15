
import { ErrorCode, ErrorCodes } from './codes'
import { errorCodeToStatus } from './status-map'
import type { ApiErrorResponse, ValidationErrorDetail, AppErrorOptions } from './types'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: ValidationErrorDetail[]
  readonly context?: Record<string, unknown>
  readonly timestamp: string

  constructor(code: ErrorCode, message: string, options?: AppErrorOptions) {
    super(message, { cause: options?.cause })
    this.name = 'AppError'
    this.code = code
    this.status = errorCodeToStatus[code]
    this.details = options?.details
    this.context = options?.context
    this.timestamp = new Date().toISOString()

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
  toResponse(traceId: string, isDev = false): ApiErrorResponse {
    return {
      code: this.code,
      message: this.message,
      traceId,
      timestamp: this.timestamp,
      status: this.status,
      details: this.details,
      context: isDev ? this.context : undefined,
    }
  }

  static fromError(error: Error, code: ErrorCode = ErrorCodes.SERVER_ERROR): AppError {
    if (error instanceof AppError) {
      return error
    }

    return new AppError(code, error.message, { cause: error })
  }

  static validation(message: string, details: ValidationErrorDetail[]): AppError {
    return new AppError(ErrorCodes.VALIDATION_FAILED, message, { details })
  }

  static notFound(resource: string, id?: string): AppError {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`
    return new AppError(ErrorCodes.RESOURCE_NOT_FOUND, message)
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(ErrorCodes.AUTH_SESSION_INVALID, message)
  }

  static forbidden(message = 'Permission denied'): AppError {
    return new AppError(ErrorCodes.AUTH_PERMISSION_DENIED, message)
  }

  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError
  }

  isCode(code: ErrorCode): boolean {
    return this.code === code
  }

  isAuthError(): boolean {
    return (
      this.code === ErrorCodes.AUTH_SESSION_EXPIRED ||
      this.code === ErrorCodes.AUTH_SESSION_INVALID ||
      this.code === ErrorCodes.AUTH_TOKEN_MISSING ||
      this.code === ErrorCodes.AUTH_TOKEN_INVALID
    )
  }

  isValidationError(): boolean {
    return (
      this.code === ErrorCodes.VALIDATION_FAILED ||
      this.code === ErrorCodes.VALIDATION_FIELD_REQUIRED ||
      this.code === ErrorCodes.VALIDATION_FIELD_INVALID ||
      this.code === ErrorCodes.VALIDATION_CONSTRAINT_VIOLATED
    )
  }

  isRetryable(): boolean {
    return (
      this.code === ErrorCodes.SERVER_ERROR ||
      this.code === ErrorCodes.SERVER_UNAVAILABLE ||
      this.code === ErrorCodes.EXTERNAL_SERVICE_ERROR ||
      this.code === ErrorCodes.NETWORK_ERROR ||
      this.code === ErrorCodes.REQUEST_TIMEOUT ||
      this.code === ErrorCodes.RATE_LIMIT_EXCEEDED
    )
  }
}
