/**
 * Error Type Definitions
 *
 * Standardized interfaces for error responses across the application.
 */

import type { ErrorCode } from './codes'

/**
 * Validation error details for field-level errors
 */
export interface ValidationErrorDetail {
  /** Field path (e.g., "email", "settings.theme") */
  field: string
  /** Human-readable error message */
  message: string
  /** Optional validation code (e.g., "too_small", "invalid_type") */
  code?: string
}

/**
 * Standardized API error response format
 *
 * All API errors should follow this schema for consistency.
 */
export interface ApiErrorResponse {
  /** Machine-readable error code for programmatic handling */
  code: ErrorCode
  /** Human-readable error message for display */
  message: string
  /** Correlation ID for tracing (from Motia traceId) */
  traceId: string
  /** ISO 8601 timestamp of error occurrence */
  timestamp: string
  /** HTTP status code */
  status: number
  /** Optional validation error details */
  details?: ValidationErrorDetail[]
  /** Optional debugging context (only in development) */
  context?: Record<string, unknown>
}

/**
 * Generic service result type
 *
 * All service methods should return this type for consistency.
 */
export interface ServiceResult<T> {
  data: T | null
  error: Error | null
}

/**
 * Options for creating an AppError
 */
export interface AppErrorOptions {
  /** Validation error details */
  details?: ValidationErrorDetail[]
  /** Additional context for debugging */
  context?: Record<string, unknown>
  /** Original error that caused this error */
  cause?: Error
}

/**
 * Serializable error data for logging and transmission
 */
export interface SerializedError {
  name: string
  message: string
  code?: ErrorCode
  status?: number
  stack?: string
  details?: ValidationErrorDetail[]
}
