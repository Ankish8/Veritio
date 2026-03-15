import { swrConfig as baseSwrConfig } from '@veritio/swr-config/config'
import { SWR_KEYS_CORE } from '@veritio/swr-config/keys'
import type { ErrorCode, ApiErrorResponse, ValidationErrorDetail } from '../errors/index'
import { ErrorCodes, inferCodeFromStatus, isApiErrorResponse } from '../errors/index'

/**
 * Options for creating a FetchError
 */
export interface FetchErrorOptions {
  /** Error code from API response */
  code?: ErrorCode
  /** Trace ID for correlation */
  traceId?: string
  /** Validation error details */
  details?: ValidationErrorDetail[]
}

/**
 * Enhanced error class for SWR/fetch operations.
 *
 * Includes:
 * - HTTP status code
 * - Error code for programmatic handling
 * - Trace ID for correlation with server logs
 * - Validation details for form errors
 *
 * @example
 * ```typescript
 * // Create from API response
 * const error = FetchError.fromApiResponse(apiError, url)
 *
 * // Check error type
 * if (error.isAuthError()) {
 *   redirectToLogin()
 * }
 * ```
 */
export class FetchError extends Error {
  readonly status: number
  readonly url: string
  readonly code: ErrorCode
  readonly traceId?: string
  readonly details?: ValidationErrorDetail[]

  constructor(
    message: string,
    status: number,
    url: string,
    options?: FetchErrorOptions
  ) {
    super(message)
    this.name = 'FetchError'
    this.status = status
    this.url = url
    this.code = options?.code ?? inferCodeFromStatus(status)
    this.traceId = options?.traceId
    this.details = options?.details

    // Maintains proper stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FetchError)
    }
  }

  /**
   * Create FetchError from a structured API error response
   */
  static fromApiResponse(response: ApiErrorResponse, url: string): FetchError {
    return new FetchError(response.message, response.status, url, {
      code: response.code,
      traceId: response.traceId,
      details: response.details,
    })
  }

  /**
   * Create FetchError from a Response object
   */
  static async fromResponse(
    response: Response,
    url: string,
    fallbackMessage?: string
  ): Promise<FetchError> {
    const traceId = response.headers.get('X-Trace-Id') ?? undefined

    // Try to parse structured error response
    try {
      const body = await response.json()

      if (isApiErrorResponse(body)) {
        return FetchError.fromApiResponse(body, url)
      }

      // Legacy error format: { error: string }
      if (typeof body.error === 'string') {
        return new FetchError(body.error, response.status, url, { traceId })
      }

      // Legacy error format: { message: string }
      if (typeof body.message === 'string') {
        return new FetchError(body.message, response.status, url, { traceId })
      }
    } catch {
      // JSON parse failed, use fallback
    }

    return new FetchError(
      fallbackMessage ?? `Request failed with status ${response.status}`,
      response.status,
      url,
      { traceId }
    )
  }

  /**
   * Check if this is an authentication error
   */
  isAuthError(): boolean {
    return (
      this.code === ErrorCodes.AUTH_SESSION_EXPIRED ||
      this.code === ErrorCodes.AUTH_SESSION_INVALID ||
      this.code === ErrorCodes.AUTH_TOKEN_MISSING ||
      this.code === ErrorCodes.AUTH_TOKEN_INVALID ||
      this.status === 401
    )
  }

  /**
   * Check if this is a validation error
   */
  isValidationError(): boolean {
    return (
      this.code === ErrorCodes.VALIDATION_FAILED ||
      this.code === ErrorCodes.VALIDATION_FIELD_REQUIRED ||
      this.code === ErrorCodes.VALIDATION_FIELD_INVALID ||
      this.status === 400 ||
      this.status === 422
    )
  }

  /**
   * Check if this error should be retried
   */
  isRetryable(): boolean {
    // Retry server errors and rate limits
    if (this.status >= 500 || this.status === 429) {
      return true
    }

    // Retry network errors
    if (
      this.code === ErrorCodes.NETWORK_ERROR ||
      this.code === ErrorCodes.REQUEST_TIMEOUT
    ) {
      return true
    }

    return false
  }

  /**
   * Check if this is a not found error
   */
  isNotFound(): boolean {
    return this.status === 404
  }
}

/**
 * SWR configuration for Optimal
 *
 * Uses shared configuration from @veritio/swr-config.
 */
export const swrConfig = baseSwrConfig

/**
 * SWR cache keys for cross-hook operations (prefetching, invalidation).
 * Uses shared core keys from @veritio/swr-config and extends with app-specific keys.
 */
export const SWR_KEYS = {
  // Import shared core keys
  ...SWR_KEYS_CORE,

  // Optimal-specific keys
  allStudies: (params?: string) => `/api/studies${params ? `?${params}` : ''}`,
  archivedStudies: '/api/studies?archived=true',

  // Favorites
  favorites: (limit: number) => `/api/favorites?limit=${limit}`,

  // Notes
  sectionNotes: (studyId: string, section: string) =>
    `/api/studies/${studyId}/sections/${section}/notes`,
  questionNotes: (studyId: string, questionId: string) =>
    `/api/studies/${studyId}/questions/${questionId}/notes`,
  allStudyNotes: (studyId: string) => `all-study-notes-${studyId}`,

  // Survey sections
  surveySections: (studyId: string) => `/api/studies/${studyId}/sections`,

  // AB Tests
  abTests: (studyId: string) => `/api/studies/${studyId}/ab-tests`,

  // Survey Rules
  surveyRules: (studyId: string) => `/api/studies/${studyId}/rules`,
  surveyVariables: (studyId: string) => `/api/studies/${studyId}/variables`,

  // User preferences
  userPreferences: '/api/user/preferences',

  // Knowledge base
  knowledgeArticles: '/api/knowledge/articles',
  knowledgeArticle: (slug: string) => `/api/knowledge/articles/${slug}`,

  // Recordings
  studyRecordings: (studyId: string) => `/api/studies/${studyId}/recordings`,
  recording: (studyId: string, recordingId: string) => `/api/studies/${studyId}/recordings/${recordingId}`,

  // Public Results
  studyPublicResults: (studyId: string) => `study-public-results-${studyId}`,

  // Organizations & Collaboration
  organizations: '/api/organizations',
  organization: (id: string) => `/api/organizations/${id}`,
  organizationMembers: (orgId: string) => `/api/organizations/${orgId}/members`,
  organizationInvitations: (orgId: string) => `/api/organizations/${orgId}/invitations`,
  invitation: (id: string) => `/api/invitations/${id}`,

  // Study Comments
  studyComments: (studyId: string) => `/api/studies/${studyId}/comments`,

  // Share Links
  studyShareLinks: (studyId: string) => `/api/share-links?study_id=${studyId}`,
  shareLink: (token: string) => `/api/share/${token}`,
} as const
