/**
 * Re-export all error utilities from @veritio/core/errors.
 * This file exists for backward compatibility with existing @/lib/errors imports.
 */
export {
  AppError,
  ErrorCodes,
  isErrorCode,
  errorCodeToStatus,
  getStatusForCode,
  inferCodeFromStatus,
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
} from '@veritio/core/errors'

export type {
  ErrorCode,
  ValidationErrorDetail,
  ApiErrorResponse,
  ServiceResult,
  AppErrorOptions,
  SerializedError,
} from '@veritio/core/errors'
