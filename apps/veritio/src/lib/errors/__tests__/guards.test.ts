import { describe, it, expect } from 'vitest'
import {
  AppError,
  ErrorCodes,
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
import type { ApiErrorResponse } from '@veritio/core/errors'

describe('Error Guards', () => {
  // Sample API error response
  const apiErrorResponse: ApiErrorResponse = {
    code: ErrorCodes.VALIDATION_FAILED,
    message: 'Validation failed',
    traceId: 'trace-123',
    timestamp: new Date().toISOString(),
    status: 400,
    details: [{ field: 'email', message: 'Invalid format' }],
  }

  describe('isApiErrorResponse', () => {
    it('should return true for valid API error response', () => {
      expect(isApiErrorResponse(apiErrorResponse)).toBe(true)
    })

    it('should return false for partial objects', () => {
      expect(isApiErrorResponse({ code: 'ERROR' })).toBe(false)
      expect(isApiErrorResponse({ message: 'Error' })).toBe(false)
      expect(isApiErrorResponse({ code: 'ERROR', message: 'Error' })).toBe(false)
    })

    it('should return false for invalid code', () => {
      expect(
        isApiErrorResponse({
          code: 'INVALID_CODE',
          message: 'Error',
          traceId: '123',
          status: 400,
        })
      ).toBe(false)
    })

    it('should return false for non-objects', () => {
      expect(isApiErrorResponse(null)).toBe(false)
      expect(isApiErrorResponse(undefined)).toBe(false)
      expect(isApiErrorResponse('error')).toBe(false)
      expect(isApiErrorResponse(123)).toBe(false)
    })
  })

  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      const error = new AppError(ErrorCodes.SERVER_ERROR, 'Error')
      expect(isAppError(error)).toBe(true)
    })

    it('should return false for generic Error', () => {
      const error = new Error('Generic error')
      expect(isAppError(error)).toBe(false)
    })

    it('should return false for non-errors', () => {
      expect(isAppError(null)).toBe(false)
      expect(isAppError(undefined)).toBe(false)
      expect(isAppError({ code: 'ERROR' })).toBe(false)
    })
  })

  describe('hasValidationDetails', () => {
    it('should return true when details array exists and has items', () => {
      expect(hasValidationDetails(apiErrorResponse)).toBe(true)
      expect(
        hasValidationDetails({ details: [{ field: 'name', message: 'Required' }] })
      ).toBe(true)
    })

    it('should return false for empty details array', () => {
      expect(hasValidationDetails({ details: [] })).toBe(false)
    })

    it('should return false when no details', () => {
      expect(hasValidationDetails({ message: 'Error' })).toBe(false)
      expect(hasValidationDetails(null)).toBe(false)
    })
  })

  describe('isAuthError', () => {
    it('should return true for AppError auth errors', () => {
      expect(isAuthError(new AppError(ErrorCodes.AUTH_SESSION_EXPIRED, 'Expired'))).toBe(
        true
      )
      expect(isAuthError(new AppError(ErrorCodes.AUTH_SESSION_INVALID, 'Invalid'))).toBe(
        true
      )
      expect(isAuthError(new AppError(ErrorCodes.AUTH_TOKEN_MISSING, 'Missing'))).toBe(
        true
      )
      expect(isAuthError(new AppError(ErrorCodes.AUTH_TOKEN_INVALID, 'Invalid'))).toBe(
        true
      )
    })

    it('should return true for API error response with auth code', () => {
      expect(
        isAuthError({
          ...apiErrorResponse,
          code: ErrorCodes.AUTH_SESSION_EXPIRED,
          status: 401,
        })
      ).toBe(true)
    })

    it('should return true for objects with status 401', () => {
      expect(isAuthError({ status: 401, message: 'Unauthorized' })).toBe(true)
    })

    it('should return false for non-auth errors', () => {
      expect(isAuthError(new AppError(ErrorCodes.STUDY_NOT_FOUND, 'Not found'))).toBe(
        false
      )
      expect(isAuthError({ status: 404 })).toBe(false)
    })
  })

  describe('isValidationError', () => {
    it('should return true for validation errors', () => {
      expect(
        isValidationError(new AppError(ErrorCodes.VALIDATION_FAILED, 'Failed'))
      ).toBe(true)
      expect(
        isValidationError(new AppError(ErrorCodes.VALIDATION_FIELD_REQUIRED, 'Required'))
      ).toBe(true)
      expect(
        isValidationError(new AppError(ErrorCodes.VALIDATION_FIELD_INVALID, 'Invalid'))
      ).toBe(true)
    })

    it('should return true for status 400 or 422', () => {
      expect(isValidationError({ status: 400 })).toBe(true)
      expect(isValidationError({ status: 422 })).toBe(true)
    })

    it('should return false for other errors', () => {
      expect(isValidationError(new AppError(ErrorCodes.SERVER_ERROR, 'Error'))).toBe(
        false
      )
      expect(isValidationError({ status: 500 })).toBe(false)
    })
  })

  describe('isNotFoundError', () => {
    it('should return true for not found errors', () => {
      expect(
        isNotFoundError(new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Not found'))
      ).toBe(true)
      expect(isNotFoundError(new AppError(ErrorCodes.STUDY_NOT_FOUND, 'Not found'))).toBe(
        true
      )
      expect(
        isNotFoundError(new AppError(ErrorCodes.PROJECT_NOT_FOUND, 'Not found'))
      ).toBe(true)
    })

    it('should return true for status 404', () => {
      expect(isNotFoundError({ status: 404 })).toBe(true)
      expect(isNotFoundError({ ...apiErrorResponse, status: 404 })).toBe(true)
    })

    it('should return false for other errors', () => {
      expect(isNotFoundError(new AppError(ErrorCodes.SERVER_ERROR, 'Error'))).toBe(false)
      expect(isNotFoundError({ status: 500 })).toBe(false)
    })
  })

  describe('isNetworkError', () => {
    it('should return true for network-related errors', () => {
      expect(isNetworkError(new AppError(ErrorCodes.NETWORK_ERROR, 'Network'))).toBe(
        true
      )
      expect(isNetworkError(new AppError(ErrorCodes.REQUEST_TIMEOUT, 'Timeout'))).toBe(
        true
      )
      expect(isNetworkError(new AppError(ErrorCodes.REQUEST_ABORTED, 'Aborted'))).toBe(
        true
      )
    })

    it('should return true for Error with network-related message', () => {
      expect(isNetworkError(new Error('Network error occurred'))).toBe(true)
      expect(isNetworkError(new Error('fetch failed'))).toBe(true)
      expect(isNetworkError(new Error('Request timeout'))).toBe(true)
      expect(isNetworkError(new Error('Connection refused'))).toBe(true)
    })

    it('should return false for other errors', () => {
      expect(isNetworkError(new AppError(ErrorCodes.SERVER_ERROR, 'Error'))).toBe(false)
      expect(isNetworkError(new Error('Validation failed'))).toBe(false)
    })
  })

  describe('isRetryableError', () => {
    it('should return true for server errors', () => {
      expect(isRetryableError(new AppError(ErrorCodes.SERVER_ERROR, 'Error'))).toBe(true)
      expect(isRetryableError({ status: 500 })).toBe(true)
      expect(isRetryableError({ status: 502 })).toBe(true)
      expect(isRetryableError({ status: 503 })).toBe(true)
    })

    it('should return true for rate limit errors', () => {
      expect(
        isRetryableError(new AppError(ErrorCodes.RATE_LIMIT_EXCEEDED, 'Rate limited'))
      ).toBe(true)
      expect(isRetryableError({ status: 429 })).toBe(true)
    })

    it('should return true for network errors', () => {
      expect(isRetryableError(new AppError(ErrorCodes.NETWORK_ERROR, 'Network'))).toBe(
        true
      )
      expect(isRetryableError(new AppError(ErrorCodes.REQUEST_TIMEOUT, 'Timeout'))).toBe(
        true
      )
    })

    it('should return false for client errors', () => {
      expect(isRetryableError(new AppError(ErrorCodes.VALIDATION_FAILED, 'Invalid'))).toBe(
        false
      )
      expect(isRetryableError({ status: 400 })).toBe(false)
      expect(isRetryableError({ status: 404 })).toBe(false)
    })
  })

  describe('isRateLimitError', () => {
    it('should return true for rate limit errors', () => {
      expect(
        isRateLimitError(new AppError(ErrorCodes.RATE_LIMIT_EXCEEDED, 'Rate limited'))
      ).toBe(true)
      expect(
        isRateLimitError({ ...apiErrorResponse, code: ErrorCodes.RATE_LIMIT_EXCEEDED })
      ).toBe(true)
      expect(isRateLimitError({ status: 429 })).toBe(true)
    })

    it('should return false for other errors', () => {
      expect(isRateLimitError(new AppError(ErrorCodes.SERVER_ERROR, 'Error'))).toBe(false)
      expect(isRateLimitError({ status: 500 })).toBe(false)
    })
  })

  describe('isServerError', () => {
    it('should return true for 5xx status codes', () => {
      expect(isServerError(new AppError(ErrorCodes.SERVER_ERROR, 'Error'))).toBe(true)
      expect(isServerError({ status: 500 })).toBe(true)
      expect(isServerError({ status: 502 })).toBe(true)
      expect(isServerError({ status: 503 })).toBe(true)
      expect(isServerError({ status: 599 })).toBe(true)
    })

    it('should return false for client errors', () => {
      expect(isServerError({ status: 400 })).toBe(false)
      expect(isServerError({ status: 404 })).toBe(false)
      expect(isServerError({ status: 499 })).toBe(false)
    })
  })

  describe('getErrorCode', () => {
    it('should extract code from AppError', () => {
      expect(getErrorCode(new AppError(ErrorCodes.STUDY_NOT_FOUND, 'Not found'))).toBe(
        ErrorCodes.STUDY_NOT_FOUND
      )
    })

    it('should extract code from API error response', () => {
      expect(getErrorCode(apiErrorResponse)).toBe(ErrorCodes.VALIDATION_FAILED)
    })

    it('should extract code from plain object with valid code', () => {
      expect(getErrorCode({ code: ErrorCodes.SERVER_ERROR })).toBe(ErrorCodes.SERVER_ERROR)
    })

    it('should return undefined for invalid code', () => {
      expect(getErrorCode({ code: 'INVALID' })).toBeUndefined()
    })

    it('should return undefined for objects without code', () => {
      expect(getErrorCode({ message: 'Error' })).toBeUndefined()
      expect(getErrorCode(new Error('Error'))).toBeUndefined()
      expect(getErrorCode(null)).toBeUndefined()
    })
  })

  describe('getErrorMessage', () => {
    it('should extract message from Error', () => {
      expect(getErrorMessage(new Error('Test error'))).toBe('Test error')
    })

    it('should extract message from AppError', () => {
      expect(getErrorMessage(new AppError(ErrorCodes.SERVER_ERROR, 'App error'))).toBe(
        'App error'
      )
    })

    it('should extract message from API error response', () => {
      expect(getErrorMessage(apiErrorResponse)).toBe('Validation failed')
    })

    it('should extract message from object with message property', () => {
      expect(getErrorMessage({ message: 'Object error' })).toBe('Object error')
    })

    it('should extract error from object with error property', () => {
      expect(getErrorMessage({ error: 'Error string' })).toBe('Error string')
    })

    it('should return string errors as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error')
    })

    it('should return default message for unknown types', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred')
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred')
      expect(getErrorMessage(123)).toBe('An unknown error occurred')
      expect(getErrorMessage({})).toBe('An unknown error occurred')
    })
  })

  describe('getTraceId', () => {
    it('should extract traceId from API error response', () => {
      expect(getTraceId(apiErrorResponse)).toBe('trace-123')
    })

    it('should extract traceId from object with traceId property', () => {
      expect(getTraceId({ traceId: 'custom-trace' })).toBe('custom-trace')
    })

    it('should extract digest as traceId (Next.js pattern)', () => {
      expect(getTraceId({ digest: 'next-digest-123' })).toBe('next-digest-123')
    })

    it('should prefer traceId over digest', () => {
      expect(getTraceId({ traceId: 'trace', digest: 'digest' })).toBe('trace')
    })

    it('should return undefined when no trace ID available', () => {
      expect(getTraceId(new Error('Error'))).toBeUndefined()
      expect(getTraceId({ message: 'Error' })).toBeUndefined()
      expect(getTraceId(null)).toBeUndefined()
    })
  })
})
