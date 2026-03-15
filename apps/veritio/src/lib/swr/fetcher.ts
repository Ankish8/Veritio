import { createAuthFetch } from '@veritio/auth/fetch'
import { ErrorCodes } from '../errors/index'
import { FetchError } from './config'

/**
 * Request timeout in milliseconds.
 * Prevents hanging requests from blocking the UI indefinitely.
 */
const REQUEST_TIMEOUT = 30000 // 30 seconds

/**
 * Extract human-readable resource name from URL for error messages.
 */
function extractResourceFromUrl(url: string): string {
  if (url.includes('/projects/')) {
    if (url.includes('/studies/')) return 'study'
    if (url.includes('/sections')) return 'sections'
    if (url.includes('/rules')) return 'rules'
    if (url.includes('/ab-tests')) return 'A/B tests'
    return 'project'
  }
  if (url.includes('/studies')) return 'studies'
  if (url.includes('/projects')) return 'projects'
  if (url.includes('/dashboard')) return 'dashboard data'
  if (url.includes('/favorites')) return 'favorites'
  if (url.includes('/notes')) return 'notes'
  if (url.includes('/participate')) return 'study'
  return 'data'
}

/**
 * Generate contextual error messages based on HTTP status.
 * Used as fallback when API doesn't return a structured error.
 */
function getFallbackErrorMessage(status: number, url: string): string {
  const resource = extractResourceFromUrl(url)

  switch (status) {
    case 401:
      return 'Your session has expired. Please sign in again.'
    case 403:
      return `You don't have permission to access this ${resource}.`
    case 404:
      return `The ${resource} was not found.`
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
    case 500:
    case 502:
    case 503:
      return 'Server error. Please try again in a few moments.'
    default:
      return `Failed to load ${resource}. Please try again.`
  }
}

/**
 * Singleton auth fetch instance to avoid recreation on every hook.
 * Uses lazy initialization for SSR safety.
 */
let authFetchInstance: ReturnType<typeof createAuthFetch> | null = null

function getAuthFetch() {
  if (!authFetchInstance) {
    authFetchInstance = createAuthFetch()
  }
  return authFetchInstance
}

/**
 * Fetch with timeout using AbortController.
 * Prevents hanging requests from blocking the UI.
 */
async function fetchWithTimeout(
  url: string,
  fetchFn: (url: string, options?: { signal?: AbortSignal }) => Promise<Response>,
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetchFn(url, { signal: controller.signal })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchError(
        'Request timed out. Please check your connection and try again.',
        408,
        url,
        { code: ErrorCodes.REQUEST_TIMEOUT }
      )
    }
    // Network errors (no response)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new FetchError(
        'Network error. Please check your connection and try again.',
        0,
        url,
        { code: ErrorCodes.NETWORK_ERROR }
      )
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Global SWR fetcher with:
 * - Authentication (Bearer token)
 * - 15 second timeout
 * - Structured error parsing (supports new ApiErrorResponse format)
 * - Fallback contextual error messages
 * - HTTP status tracking for retry logic
 *
 * This fetcher is automatically used by SWRConfig provider.
 * Individual hooks don't need to create their own fetcher.
 *
 * @example
 * ```tsx
 * // In SWRConfig (automatic)
 * <SWRConfig value={{ fetcher: swrFetcher }}>
 *
 * // In hooks (no fetcher needed)
 * const { data } = useSWR('/api/projects')
 * ```
 */
export async function swrFetcher<T>(url: string): Promise<T> {
  const authFetch = getAuthFetch()

  const response = await fetchWithTimeout(url, authFetch)

  if (!response.ok) {
    // Parse structured error response, falling back to contextual message
    throw await FetchError.fromResponse(
      response,
      url,
      getFallbackErrorMessage(response.status, url)
    )
  }

  const data = await response.json()
  return data
}

/**
 * Public fetcher for unauthenticated endpoints (e.g., participant pages).
 * Uses the same timeout and error handling as swrFetcher.
 *
 * @example
 * ```tsx
 * const { data } = useSWR('/api/participate/ABC123', publicFetcher)
 * ```
 */
export async function publicFetcher<T>(url: string): Promise<T> {
  const response = await fetchWithTimeout(url, fetch)

  if (!response.ok) {
    // Parse structured error response, falling back to contextual message
    throw await FetchError.fromResponse(
      response,
      url,
      getFallbackErrorMessage(response.status, url)
    )
  }

  const data = await response.json()
  return data
}

/**
 * Fetcher variant that extracts data from pagination wrapper.
 * Use for endpoints that return { data: T[], total: number }.
 *
 * @example
 * ```tsx
 * const { data } = useSWR('/api/studies?limit=10', swrFetcherUnwrap)
 * // data is T[] instead of { data: T[], total: number }
 * ```
 */
export async function swrFetcherUnwrap<T>(url: string): Promise<T> {
  const result = await swrFetcher<{ data: T } | T>(url)

  if (result && typeof result === 'object' && 'data' in result) {
    return result.data
  }

  return result as T
}

/**
 * Get the singleton auth fetch instance for use in mutations.
 * Mutations (POST, PATCH, DELETE) should not go through SWR fetcher.
 *
 * @example
 * ```tsx
 * const authFetch = getAuthFetchInstance()
 * await authFetch('/api/projects', { method: 'POST', body: JSON.stringify(data) })
 * ```
 */
export function getAuthFetchInstance() {
  return getAuthFetch()
}
