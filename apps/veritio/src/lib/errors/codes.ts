/**
 * Error Code Constants
 *
 * Error codes follow the pattern: {DOMAIN}_{ACTION}_{REASON}
 * Grouped by domain for easy organization and lookup.
 */

export const ErrorCodes = {
  // ═══════════════════════════════════════════════════════════════════════════
  // Authentication Errors (AUTH_*)
  // ═══════════════════════════════════════════════════════════════════════════
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_SESSION_INVALID: 'AUTH_SESSION_INVALID',
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_PERMISSION_DENIED: 'AUTH_PERMISSION_DENIED',

  // ═══════════════════════════════════════════════════════════════════════════
  // Validation Errors (VALIDATION_*)
  // ═══════════════════════════════════════════════════════════════════════════
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_FIELD_REQUIRED: 'VALIDATION_FIELD_REQUIRED',
  VALIDATION_FIELD_INVALID: 'VALIDATION_FIELD_INVALID',
  VALIDATION_CONSTRAINT_VIOLATED: 'VALIDATION_CONSTRAINT_VIOLATED',

  // ═══════════════════════════════════════════════════════════════════════════
  // Resource Errors (RESOURCE_*)
  // ═══════════════════════════════════════════════════════════════════════════
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_ARCHIVED: 'RESOURCE_ARCHIVED',

  // ═══════════════════════════════════════════════════════════════════════════
  // Study Errors (STUDY_*)
  // ═══════════════════════════════════════════════════════════════════════════
  STUDY_NOT_FOUND: 'STUDY_NOT_FOUND',
  STUDY_NOT_ACTIVE: 'STUDY_NOT_ACTIVE',
  STUDY_CLOSED: 'STUDY_CLOSED',
  STUDY_LIMIT_REACHED: 'STUDY_LIMIT_REACHED',
  STUDY_INVALID_TYPE: 'STUDY_INVALID_TYPE',

  // ═══════════════════════════════════════════════════════════════════════════
  // Project Errors (PROJECT_*)
  // ═══════════════════════════════════════════════════════════════════════════
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  PROJECT_ARCHIVED: 'PROJECT_ARCHIVED',

  // ═══════════════════════════════════════════════════════════════════════════
  // Participant Errors (PARTICIPANT_*)
  // ═══════════════════════════════════════════════════════════════════════════
  PARTICIPANT_NOT_FOUND: 'PARTICIPANT_NOT_FOUND',
  PARTICIPANT_SESSION_INVALID: 'PARTICIPANT_SESSION_INVALID',
  PARTICIPANT_DUPLICATE_BLOCKED: 'PARTICIPANT_DUPLICATE_BLOCKED',
  PARTICIPANT_ALREADY_COMPLETED: 'PARTICIPANT_ALREADY_COMPLETED',

  // ═══════════════════════════════════════════════════════════════════════════
  // Rate Limiting Errors (RATE_*)
  // ═══════════════════════════════════════════════════════════════════════════
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // ═══════════════════════════════════════════════════════════════════════════
  // Server Errors (SERVER_*)
  // ═══════════════════════════════════════════════════════════════════════════
  SERVER_ERROR: 'SERVER_ERROR',
  SERVER_UNAVAILABLE: 'SERVER_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // ═══════════════════════════════════════════════════════════════════════════
  // Network/Client Errors (NETWORK_*, REQUEST_*)
  // ═══════════════════════════════════════════════════════════════════════════
  NETWORK_ERROR: 'NETWORK_ERROR',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  REQUEST_ABORTED: 'REQUEST_ABORTED',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

/**
 * Check if a string is a valid ErrorCode
 */
export function isErrorCode(code: string): code is ErrorCode {
  return Object.values(ErrorCodes).includes(code as ErrorCode)
}
