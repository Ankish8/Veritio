/**
 * Error Code to HTTP Status Code Mapping
 *
 * Maps each ErrorCode to its corresponding HTTP status code.
 * This ensures consistent status codes across all API responses.
 */

import type { ErrorCode } from './codes'
import { ErrorCodes } from './codes'

/**
 * Maps error codes to their HTTP status codes
 */
export const errorCodeToStatus: Record<ErrorCode, number> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // 401 Unauthorized - Authentication required or failed
  // ═══════════════════════════════════════════════════════════════════════════
  [ErrorCodes.AUTH_SESSION_EXPIRED]: 401,
  [ErrorCodes.AUTH_SESSION_INVALID]: 401,
  [ErrorCodes.AUTH_TOKEN_MISSING]: 401,
  [ErrorCodes.AUTH_TOKEN_INVALID]: 401,

  // ═══════════════════════════════════════════════════════════════════════════
  // 403 Forbidden - Authenticated but not authorized
  // ═══════════════════════════════════════════════════════════════════════════
  [ErrorCodes.AUTH_PERMISSION_DENIED]: 403,

  // ═══════════════════════════════════════════════════════════════════════════
  // 400 Bad Request - Client sent invalid data
  // ═══════════════════════════════════════════════════════════════════════════
  [ErrorCodes.VALIDATION_FAILED]: 400,
  [ErrorCodes.VALIDATION_FIELD_REQUIRED]: 400,
  [ErrorCodes.VALIDATION_FIELD_INVALID]: 400,
  [ErrorCodes.VALIDATION_CONSTRAINT_VIOLATED]: 400,

  // ═══════════════════════════════════════════════════════════════════════════
  // 404 Not Found - Resource doesn't exist
  // ═══════════════════════════════════════════════════════════════════════════
  [ErrorCodes.RESOURCE_NOT_FOUND]: 404,
  [ErrorCodes.STUDY_NOT_FOUND]: 404,
  [ErrorCodes.PROJECT_NOT_FOUND]: 404,
  [ErrorCodes.PARTICIPANT_NOT_FOUND]: 404,

  // ═══════════════════════════════════════════════════════════════════════════
  // 409 Conflict - Resource state conflict
  // ═══════════════════════════════════════════════════════════════════════════
  [ErrorCodes.RESOURCE_ALREADY_EXISTS]: 409,
  [ErrorCodes.RESOURCE_CONFLICT]: 409,
  [ErrorCodes.PARTICIPANT_DUPLICATE_BLOCKED]: 409,
  [ErrorCodes.PARTICIPANT_ALREADY_COMPLETED]: 409,

  // ═══════════════════════════════════════════════════════════════════════════
  // 410 Gone - Resource no longer available
  // ═══════════════════════════════════════════════════════════════════════════
  [ErrorCodes.RESOURCE_ARCHIVED]: 410,
  [ErrorCodes.PROJECT_ARCHIVED]: 410,
  [ErrorCodes.STUDY_CLOSED]: 410,

  // ═══════════════════════════════════════════════════════════════════════════
  // 422 Unprocessable Entity - Valid syntax but semantic error
  // ═══════════════════════════════════════════════════════════════════════════
  [ErrorCodes.STUDY_NOT_ACTIVE]: 422,
  [ErrorCodes.STUDY_LIMIT_REACHED]: 422,
  [ErrorCodes.STUDY_INVALID_TYPE]: 422,
  [ErrorCodes.PARTICIPANT_SESSION_INVALID]: 422,

  // ═══════════════════════════════════════════════════════════════════════════
  // 429 Too Many Requests - Rate limited
  // ═══════════════════════════════════════════════════════════════════════════
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,

  // ═══════════════════════════════════════════════════════════════════════════
  // 500 Internal Server Error - Server-side failures
  // ═══════════════════════════════════════════════════════════════════════════
  [ErrorCodes.SERVER_ERROR]: 500,
  [ErrorCodes.DATABASE_ERROR]: 500,

  // ═══════════════════════════════════════════════════════════════════════════
  // 502/503 Service Errors - External dependencies or unavailability
  // ═══════════════════════════════════════════════════════════════════════════
  [ErrorCodes.SERVER_UNAVAILABLE]: 503,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCodes.NETWORK_ERROR]: 502,

  // ═══════════════════════════════════════════════════════════════════════════
  // 408/499 Client Timeout/Abort
  // ═══════════════════════════════════════════════════════════════════════════
  [ErrorCodes.REQUEST_TIMEOUT]: 408,
  [ErrorCodes.REQUEST_ABORTED]: 499, // nginx-style client closed request
}

/**
 * Get the HTTP status code for an error code
 * Returns 500 if code is not found (defensive fallback)
 */
export function getStatusForCode(code: ErrorCode): number {
  return errorCodeToStatus[code] ?? 500
}

/**
 * Infer an error code from an HTTP status code
 * Used for legacy error responses that don't include a code
 */
export function inferCodeFromStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCodes.VALIDATION_FAILED
    case 401:
      return ErrorCodes.AUTH_SESSION_INVALID
    case 403:
      return ErrorCodes.AUTH_PERMISSION_DENIED
    case 404:
      return ErrorCodes.RESOURCE_NOT_FOUND
    case 408:
      return ErrorCodes.REQUEST_TIMEOUT
    case 409:
      return ErrorCodes.RESOURCE_CONFLICT
    case 410:
      return ErrorCodes.RESOURCE_ARCHIVED
    case 422:
      return ErrorCodes.VALIDATION_CONSTRAINT_VIOLATED
    case 429:
      return ErrorCodes.RATE_LIMIT_EXCEEDED
    case 502:
      return ErrorCodes.EXTERNAL_SERVICE_ERROR
    case 503:
      return ErrorCodes.SERVER_UNAVAILABLE
    default:
      return status >= 500 ? ErrorCodes.SERVER_ERROR : ErrorCodes.VALIDATION_FAILED
  }
}
