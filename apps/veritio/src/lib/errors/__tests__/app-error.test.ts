import { describe, it, expect } from 'vitest'
import { AppError } from '@veritio/core/errors'
import { ErrorCodes } from '@veritio/core/errors'

describe('AppError', () => {
  describe('constructor', () => {
    it('should create error with code and message', () => {
      const error = new AppError(ErrorCodes.STUDY_NOT_FOUND, 'Study not found')

      expect(error.code).toBe('STUDY_NOT_FOUND')
      expect(error.message).toBe('Study not found')
      expect(error.name).toBe('AppError')
    })

    it('should set correct HTTP status from error code', () => {
      const notFound = new AppError(ErrorCodes.STUDY_NOT_FOUND, 'Not found')
      const unauthorized = new AppError(ErrorCodes.AUTH_SESSION_INVALID, 'Invalid')
      const validation = new AppError(ErrorCodes.VALIDATION_FAILED, 'Invalid input')
      const server = new AppError(ErrorCodes.SERVER_ERROR, 'Server error')

      expect(notFound.status).toBe(404)
      expect(unauthorized.status).toBe(401)
      expect(validation.status).toBe(400)
      expect(server.status).toBe(500)
    })

    it('should include validation details when provided', () => {
      const error = new AppError(ErrorCodes.VALIDATION_FAILED, 'Validation failed', {
        details: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'name', message: 'Name is required', code: 'required' },
        ],
      })

      expect(error.details).toHaveLength(2)
      expect(error.details![0].field).toBe('email')
      expect(error.details![1].code).toBe('required')
    })

    it('should include context when provided', () => {
      const error = new AppError(ErrorCodes.DATABASE_ERROR, 'Query failed', {
        context: { table: 'studies', operation: 'insert' },
      })

      expect(error.context).toEqual({ table: 'studies', operation: 'insert' })
    })

    it('should set timestamp on creation', () => {
      const before = new Date().toISOString()
      const error = new AppError(ErrorCodes.SERVER_ERROR, 'Error')
      const after = new Date().toISOString()

      expect(error.timestamp >= before).toBe(true)
      expect(error.timestamp <= after).toBe(true)
    })

    it('should preserve cause when provided', () => {
      const cause = new Error('Original error')
      const error = new AppError(ErrorCodes.DATABASE_ERROR, 'Wrapped error', {
        cause,
      })

      expect(error.cause).toBe(cause)
    })
  })

  describe('toResponse', () => {
    it('should serialize to API response format', () => {
      const error = new AppError(ErrorCodes.VALIDATION_FAILED, 'Invalid input', {
        details: [{ field: 'email', message: 'Invalid format' }],
      })

      const response = error.toResponse('trace-123', false)

      expect(response.code).toBe('VALIDATION_FAILED')
      expect(response.message).toBe('Invalid input')
      expect(response.traceId).toBe('trace-123')
      expect(response.status).toBe(400)
      expect(response.details).toHaveLength(1)
      expect(response.timestamp).toBe(error.timestamp)
    })

    it('should exclude context in production mode', () => {
      const error = new AppError(ErrorCodes.SERVER_ERROR, 'Error', {
        context: { sensitive: 'data' },
      })

      const response = error.toResponse('trace-123', false)

      expect(response.context).toBeUndefined()
    })

    it('should include context in development mode', () => {
      const error = new AppError(ErrorCodes.SERVER_ERROR, 'Error', {
        context: { debug: 'info' },
      })

      const response = error.toResponse('trace-123', true)

      expect(response.context).toEqual({ debug: 'info' })
    })
  })

  describe('static factory methods', () => {
    it('fromError should wrap generic Error', () => {
      const original = new Error('Something went wrong')
      const appError = AppError.fromError(original)

      expect(appError.message).toBe('Something went wrong')
      expect(appError.code).toBe(ErrorCodes.SERVER_ERROR)
      expect(appError.cause).toBe(original)
    })

    it('fromError should return AppError unchanged', () => {
      const original = new AppError(ErrorCodes.STUDY_NOT_FOUND, 'Not found')
      const result = AppError.fromError(original)

      expect(result).toBe(original)
    })

    it('fromError should use provided code', () => {
      const original = new Error('Auth failed')
      const appError = AppError.fromError(original, ErrorCodes.AUTH_SESSION_INVALID)

      expect(appError.code).toBe(ErrorCodes.AUTH_SESSION_INVALID)
    })

    it('validation should create validation error with details', () => {
      const error = AppError.validation('Invalid input', [
        { field: 'title', message: 'Too short' },
      ])

      expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED)
      expect(error.details).toHaveLength(1)
    })

    it('notFound should create not found error', () => {
      const error = AppError.notFound('Study', '123')

      expect(error.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND)
      expect(error.message).toBe("Study with ID '123' not found")
      expect(error.status).toBe(404)
    })

    it('notFound should work without ID', () => {
      const error = AppError.notFound('Project')

      expect(error.message).toBe('Project not found')
    })

    it('unauthorized should create auth error', () => {
      const error = AppError.unauthorized()

      expect(error.code).toBe(ErrorCodes.AUTH_SESSION_INVALID)
      expect(error.status).toBe(401)
    })

    it('forbidden should create permission error', () => {
      const error = AppError.forbidden('Cannot delete this study')

      expect(error.code).toBe(ErrorCodes.AUTH_PERMISSION_DENIED)
      expect(error.status).toBe(403)
      expect(error.message).toBe('Cannot delete this study')
    })
  })

  describe('instance methods', () => {
    it('isAppError should identify AppError instances', () => {
      const appError = new AppError(ErrorCodes.SERVER_ERROR, 'Error')
      const genericError = new Error('Generic')

      expect(AppError.isAppError(appError)).toBe(true)
      expect(AppError.isAppError(genericError)).toBe(false)
      expect(AppError.isAppError(null)).toBe(false)
      expect(AppError.isAppError(undefined)).toBe(false)
    })

    it('isCode should check for specific error code', () => {
      const error = new AppError(ErrorCodes.STUDY_NOT_FOUND, 'Not found')

      expect(error.isCode(ErrorCodes.STUDY_NOT_FOUND)).toBe(true)
      expect(error.isCode(ErrorCodes.SERVER_ERROR)).toBe(false)
    })

    it('isAuthError should identify auth errors', () => {
      const sessionExpired = new AppError(ErrorCodes.AUTH_SESSION_EXPIRED, 'Expired')
      const sessionInvalid = new AppError(ErrorCodes.AUTH_SESSION_INVALID, 'Invalid')
      const tokenMissing = new AppError(ErrorCodes.AUTH_TOKEN_MISSING, 'Missing')
      const notAuth = new AppError(ErrorCodes.STUDY_NOT_FOUND, 'Not found')

      expect(sessionExpired.isAuthError()).toBe(true)
      expect(sessionInvalid.isAuthError()).toBe(true)
      expect(tokenMissing.isAuthError()).toBe(true)
      expect(notAuth.isAuthError()).toBe(false)
    })

    it('isValidationError should identify validation errors', () => {
      const validation = new AppError(ErrorCodes.VALIDATION_FAILED, 'Failed')
      const fieldRequired = new AppError(ErrorCodes.VALIDATION_FIELD_REQUIRED, 'Required')
      const notValidation = new AppError(ErrorCodes.SERVER_ERROR, 'Server error')

      expect(validation.isValidationError()).toBe(true)
      expect(fieldRequired.isValidationError()).toBe(true)
      expect(notValidation.isValidationError()).toBe(false)
    })

    it('isRetryable should identify retryable errors', () => {
      const serverError = new AppError(ErrorCodes.SERVER_ERROR, 'Error')
      const networkError = new AppError(ErrorCodes.NETWORK_ERROR, 'Network')
      const rateLimit = new AppError(ErrorCodes.RATE_LIMIT_EXCEEDED, 'Rate limited')
      const notFound = new AppError(ErrorCodes.STUDY_NOT_FOUND, 'Not found')
      const validation = new AppError(ErrorCodes.VALIDATION_FAILED, 'Invalid')

      expect(serverError.isRetryable()).toBe(true)
      expect(networkError.isRetryable()).toBe(true)
      expect(rateLimit.isRetryable()).toBe(true)
      expect(notFound.isRetryable()).toBe(false)
      expect(validation.isRetryable()).toBe(false)
    })
  })
})
