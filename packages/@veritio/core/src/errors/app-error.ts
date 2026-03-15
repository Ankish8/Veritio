/**
 * AppError - Application Error Class
 *
 * Custom error class that provides structured error information.
 * Used throughout the application for consistent error handling.
 */

import type { ErrorCode } from './codes'
import { ErrorCodes } from './codes'
import { errorCodeToStatus } from './status-map'
import type { ApiErrorResponse, ValidationErrorDetail, AppErrorOptions } from './types'

/**
 * Application-specific error class with structured error information.
 *
 * @example
 * ```typescript
 * // Simple error
 * throw new AppError(ErrorCodes.STUDY_NOT_FOUND, 'Study not found')
 *
 * // With validation details
 * throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Invalid input', {
 *   details: [{ field: 'email', message: 'Invalid email format' }]
 * })
 *
 * // With cause
 * throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to save', {
 *   cause: originalError
 * })
 * ```
 */
export class AppError extends Error {
  /** Machine-readable error code */
  readonly code: ErrorCode
  /** HTTP status code */
  readonly status: number
  /** Validation error details */
  readonly details?: ValidationErrorDetail[]
  /** Additional debugging context */
  readonly context?: Record<string, unknown>
  /** ISO 8601 timestamp of error creation */
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

  /**
   * Convert error to API response format
   *
   * @param traceId - Correlation ID from the request context
   * @param isDev - Whether to include debug context
   */
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

  /**
   * Create an AppError from a generic Error
   */
  static fromError(error: Error, code: ErrorCode = ErrorCodes.SERVER_ERROR): AppError {
    if (error instanceof AppError) {
      return error
    }

    return new AppError(code, error.message, { cause: error })
  }

  /**
   * Create a validation error with field details
   */
  static validation(message: string, details: ValidationErrorDetail[]): AppError {
    return new AppError(ErrorCodes.VALIDATION_FAILED, message, { details })
  }

  /**
   * Create a not found error
   */
  static notFound(resource: string, id?: string): AppError {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`
    return new AppError(ErrorCodes.RESOURCE_NOT_FOUND, message)
  }

  /**
   * Create an authentication error
   */
  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(ErrorCodes.AUTH_SESSION_INVALID, message)
  }

  /**
   * Create a permission error
   */
  static forbidden(message = 'Permission denied'): AppError {
    return new AppError(ErrorCodes.AUTH_PERMISSION_DENIED, message)
  }

  /**
   * Check if error is an AppError
   */
  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError
  }

  /**
   * Check if error is a specific type of error
   */
  isCode(code: ErrorCode): boolean {
    return this.code === code
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(): boolean {
    return (
      this.code === ErrorCodes.AUTH_SESSION_EXPIRED ||
      this.code === ErrorCodes.AUTH_SESSION_INVALID ||
      this.code === ErrorCodes.AUTH_TOKEN_MISSING ||
      this.code === ErrorCodes.AUTH_TOKEN_INVALID
    )
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(): boolean {
    return (
      this.code === ErrorCodes.VALIDATION_FAILED ||
      this.code === ErrorCodes.VALIDATION_FIELD_REQUIRED ||
      this.code === ErrorCodes.VALIDATION_FIELD_INVALID ||
      this.code === ErrorCodes.VALIDATION_CONSTRAINT_VIOLATED
    )
  }

  /**
   * Check if error is retryable
   */
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
