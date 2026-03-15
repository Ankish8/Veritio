/**
 * Error Type Guards
 *
 * Type-safe utilities for checking and narrowing error types.
 */

import type { ErrorCode } from './codes'
import { ErrorCodes, isErrorCode } from './codes'
import { AppError } from './app-error'
import type { ApiErrorResponse, ValidationErrorDetail } from './types'

/**
 * Check if an object is an ApiErrorResponse
 */
export function isApiErrorResponse(error: unknown): error is ApiErrorResponse {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const obj = error as Record<string, unknown>
  return (
    typeof obj.code === 'string' &&
    isErrorCode(obj.code) &&
    typeof obj.message === 'string' &&
    typeof obj.traceId === 'string' &&
    typeof obj.status === 'number'
  )
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Check if an error has validation details
 */
export function hasValidationDetails(
  error: unknown
): error is { details: ValidationErrorDetail[] } {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const obj = error as Record<string, unknown>
  return Array.isArray(obj.details) && obj.details.length > 0
}

/**
 * Check if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isAuthError()
  }

  if (isApiErrorResponse(error)) {
    return (
      error.code === ErrorCodes.AUTH_SESSION_EXPIRED ||
      error.code === ErrorCodes.AUTH_SESSION_INVALID ||
      error.code === ErrorCodes.AUTH_TOKEN_MISSING ||
      error.code === ErrorCodes.AUTH_TOKEN_INVALID
    )
  }

  // Check for status-based detection
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    return obj.status === 401
  }

  return false
}

/**
 * Check if an error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isValidationError()
  }

  if (isApiErrorResponse(error)) {
    return (
      error.code === ErrorCodes.VALIDATION_FAILED ||
      error.code === ErrorCodes.VALIDATION_FIELD_REQUIRED ||
      error.code === ErrorCodes.VALIDATION_FIELD_INVALID ||
      error.code === ErrorCodes.VALIDATION_CONSTRAINT_VIOLATED
    )
  }

  // Check for status-based detection
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    return obj.status === 400 || obj.status === 422
  }

  return false
}

/**
 * Check if an error is a not found error
 */
export function isNotFoundError(error: unknown): boolean {
  if (isAppError(error)) {
    return (
      error.code === ErrorCodes.RESOURCE_NOT_FOUND ||
      error.code === ErrorCodes.STUDY_NOT_FOUND ||
      error.code === ErrorCodes.PROJECT_NOT_FOUND ||
      error.code === ErrorCodes.PARTICIPANT_NOT_FOUND
    )
  }

  if (isApiErrorResponse(error)) {
    return error.status === 404
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    return obj.status === 404
  }

  return false
}

/**
 * Check if an error is a network/connectivity error
 */
export function isNetworkError(error: unknown): boolean {
  if (isAppError(error)) {
    return (
      error.code === ErrorCodes.NETWORK_ERROR ||
      error.code === ErrorCodes.REQUEST_TIMEOUT ||
      error.code === ErrorCodes.REQUEST_ABORTED
    )
  }

  if (isApiErrorResponse(error)) {
    return (
      error.code === ErrorCodes.NETWORK_ERROR ||
      error.code === ErrorCodes.REQUEST_TIMEOUT ||
      error.code === ErrorCodes.REQUEST_ABORTED
    )
  }

  // Check for common network error indicators
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('aborted') ||
      message.includes('connection')
    )
  }

  return false
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isRetryable()
  }

  if (isApiErrorResponse(error)) {
    return (
      error.status >= 500 ||
      error.status === 429 ||
      error.code === ErrorCodes.NETWORK_ERROR ||
      error.code === ErrorCodes.REQUEST_TIMEOUT
    )
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    const status = typeof obj.status === 'number' ? obj.status : 0
    return status >= 500 || status === 429
  }

  // Network errors are generally retryable
  return isNetworkError(error)
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.code === ErrorCodes.RATE_LIMIT_EXCEEDED
  }

  if (isApiErrorResponse(error)) {
    return error.code === ErrorCodes.RATE_LIMIT_EXCEEDED || error.status === 429
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    return obj.status === 429
  }

  return false
}

/**
 * Check if an error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.status >= 500
  }

  if (isApiErrorResponse(error)) {
    return error.status >= 500
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    const status = typeof obj.status === 'number' ? obj.status : 0
    return status >= 500
  }

  return false
}

/**
 * Get the error code from any error-like object
 */
export function getErrorCode(error: unknown): ErrorCode | undefined {
  if (isAppError(error)) {
    return error.code
  }

  if (isApiErrorResponse(error)) {
    return error.code
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    if (typeof obj.code === 'string' && isErrorCode(obj.code)) {
      return obj.code
    }
  }

  return undefined
}

/**
 * Get the error message from any error-like object
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (isApiErrorResponse(error)) {
    return error.message
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    if (typeof obj.message === 'string') {
      return obj.message
    }
    if (typeof obj.error === 'string') {
      return obj.error
    }
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unknown error occurred'
}

/**
 * Get the trace ID from any error-like object
 */
export function getTraceId(error: unknown): string | undefined {
  if (isApiErrorResponse(error)) {
    return error.traceId
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    if (typeof obj.traceId === 'string') {
      return obj.traceId
    }
    if (typeof obj.digest === 'string') {
      return obj.digest // Next.js error digest
    }
  }

  return undefined
}
