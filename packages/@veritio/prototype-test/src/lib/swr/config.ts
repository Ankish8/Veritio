import type { SWRConfiguration } from 'swr'
import type { ErrorCode, ApiErrorResponse, ValidationErrorDetail } from '../../errors/index'
import { ErrorCodes, inferCodeFromStatus, isApiErrorResponse } from '../../errors/index'

export interface FetchErrorOptions {
  code?: ErrorCode
  traceId?: string
  details?: ValidationErrorDetail[]
}

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

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FetchError)
    }
  }

  static fromApiResponse(response: ApiErrorResponse, url: string): FetchError {
    return new FetchError(response.message, response.status, url, {
      code: response.code,
      traceId: response.traceId,
      details: response.details,
    })
  }

  static async fromResponse(
    response: Response,
    url: string,
    fallbackMessage?: string
  ): Promise<FetchError> {
    const traceId = response.headers.get('X-Trace-Id') ?? undefined

    try {
      const body = await response.json()

      if (isApiErrorResponse(body)) {
        return FetchError.fromApiResponse(body, url)
      }

      if (typeof body.error === 'string') {
        return new FetchError(body.error, response.status, url, { traceId })
      }

      if (typeof body.message === 'string') {
        return new FetchError(body.message, response.status, url, { traceId })
      }
    } catch {
      // JSON parse failed
    }

    return new FetchError(
      fallbackMessage ?? `Request failed with status ${response.status}`,
      response.status,
      url,
      { traceId }
    )
  }

  isAuthError(): boolean {
    return (
      this.code === ErrorCodes.AUTH_SESSION_EXPIRED ||
      this.code === ErrorCodes.AUTH_SESSION_INVALID ||
      this.code === ErrorCodes.AUTH_TOKEN_MISSING ||
      this.code === ErrorCodes.AUTH_TOKEN_INVALID ||
      this.status === 401
    )
  }

  isValidationError(): boolean {
    return (
      this.code === ErrorCodes.VALIDATION_FAILED ||
      this.code === ErrorCodes.VALIDATION_FIELD_REQUIRED ||
      this.code === ErrorCodes.VALIDATION_FIELD_INVALID ||
      this.status === 400 ||
      this.status === 422
    )
  }

  isRetryable(): boolean {
    if (this.status >= 500 || this.status === 429) {
      return true
    }

    if (
      this.code === ErrorCodes.NETWORK_ERROR ||
      this.code === ErrorCodes.REQUEST_TIMEOUT
    ) {
      return true
    }

    return false
  }

  isNotFound(): boolean {
    return this.status === 404
  }
}

export const swrConfig: SWRConfiguration = {
  dedupingInterval: 30000,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  keepPreviousData: true,
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
    const fetchError = error as FetchError

    // Don't retry 4xx (except 429)
    if (
      fetchError.status &&
      fetchError.status >= 400 &&
      fetchError.status < 500 &&
      fetchError.status !== 429
    ) {
      return
    }

    if (retryCount >= 3) return

    // Exponential backoff with jitter: 1s -> 2s -> 4s (capped at 10s)
    const baseDelay = Math.min(1000 * Math.pow(2, retryCount), 10000)
    const jitter = baseDelay * 0.2 * Math.random()
    const delay = baseDelay + jitter

    setTimeout(() => revalidate({ retryCount }), delay)
  },

  suspense: false,
}

export const SWR_KEYS = {
  dashboard: '/api/dashboard/stats',

  projects: '/api/projects',
  archivedProjects: '/api/projects?archived=true',
  project: (id: string) => `/api/projects/${id}`,

  allStudies: (params?: string) => `/api/studies${params ? `?${params}` : ''}`,
  archivedStudies: '/api/studies?archived=true',
  projectStudies: (projectId: string) => `/api/projects/${projectId}/studies`,
  study: (id: string) => `/api/studies/${id}`,

  favorites: (limit: number) => `/api/favorites?limit=${limit}`,

  sectionNotes: (studyId: string, section: string) =>
    `/api/studies/${studyId}/sections/${section}/notes`,
  questionNotes: (studyId: string, questionId: string) =>
    `/api/studies/${studyId}/questions/${questionId}/notes`,
  allStudyNotes: (studyId: string) => `all-study-notes-${studyId}`,

  surveySections: (studyId: string) => `/api/studies/${studyId}/sections`,

  abTests: (studyId: string) => `/api/studies/${studyId}/ab-tests`,

  surveyRules: (studyId: string) => `/api/studies/${studyId}/rules`,
  surveyVariables: (studyId: string) => `/api/studies/${studyId}/variables`,

  userPreferences: '/api/user/preferences',

  knowledgeArticles: '/api/knowledge/articles',
  knowledgeArticle: (slug: string) => `/api/knowledge/articles/${slug}`,

  studyRecordings: (studyId: string) => `/api/studies/${studyId}/recordings`,
  recording: (studyId: string, recordingId: string) => `/api/studies/${studyId}/recordings/${recordingId}`,

  studyPublicResults: (studyId: string) => `study-public-results-${studyId}`,

  organizations: '/api/organizations',
  organization: (id: string) => `/api/organizations/${id}`,
  organizationMembers: (orgId: string) => `/api/organizations/${orgId}/members`,
  organizationInvitations: (orgId: string) => `/api/invitations?organization_id=${orgId}`,
  invitation: (id: string) => `/api/invitations/${id}`,

  studyComments: (studyId: string) => `/api/studies/${studyId}/comments`,

  studyShareLinks: (studyId: string) => `/api/share-links?study_id=${studyId}`,
  shareLink: (token: string) => `/api/share/${token}`,
} as const
