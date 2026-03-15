/**
 * Error Handling Infrastructure
 *
 * Centralized error handling with structured codes, types, and guards.
 *
 * @example
 * ```typescript
 * import { AppError, ErrorCodes, isAuthError } from './index'
 *
 * // Throw structured error
 * throw new AppError(ErrorCodes.STUDY_NOT_FOUND, 'Study not found')
 *
 * // Check error type
 * if (isAuthError(error)) {
 *   redirectToLogin()
 * }
 * ```
 */

// Error codes
export { ErrorCodes, isErrorCode } from './codes'
export type { ErrorCode } from './codes'

// Status mapping
export { errorCodeToStatus, getStatusForCode, inferCodeFromStatus } from './status-map'

// Types
export type {
  ValidationErrorDetail,
  ApiErrorResponse,
  ServiceResult,
  AppErrorOptions,
  SerializedError,
} from './types'

// AppError class
export { AppError } from './app-error'

// Type guards
export {
  isApiErrorResponse,
  isAppError,
  hasValidationDetails,
  isAuthError,
  isValidationError,
  isNotFoundError,
  isNetworkError,
  isRetryableError,
  isRateLimitError,
  isServerError,
  getErrorCode,
  getErrorMessage,
  getTraceId,
} from './guards'
