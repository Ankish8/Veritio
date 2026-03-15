import { createAuthFetch } from '../auth-fetch'
import { ErrorCodes } from '../../errors/index'
import { FetchError } from './config'

const REQUEST_TIMEOUT = 15000

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

let authFetchInstance: ReturnType<typeof createAuthFetch> | null = null

function getAuthFetch() {
  if (!authFetchInstance) {
    authFetchInstance = createAuthFetch()
  }
  return authFetchInstance
}

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

export async function swrFetcher<T>(url: string): Promise<T> {
  const authFetch = getAuthFetch()

  const response = await fetchWithTimeout(url, authFetch)

  if (!response.ok) {
    throw await FetchError.fromResponse(
      response,
      url,
      getFallbackErrorMessage(response.status, url)
    )
  }

  const data = await response.json()
  return data
}

export async function publicFetcher<T>(url: string): Promise<T> {
  const response = await fetchWithTimeout(url, fetch)

  if (!response.ok) {
    throw await FetchError.fromResponse(
      response,
      url,
      getFallbackErrorMessage(response.status, url)
    )
  }

  const data = await response.json()
  return data
}
export async function swrFetcherUnwrap<T>(url: string): Promise<T> {
  const result = await swrFetcher<{ data: T } | T>(url)

  if (result && typeof result === 'object' && 'data' in result) {
    return result.data
  }

  return result as T
}

export function getAuthFetchInstance() {
  return getAuthFetch()
}
