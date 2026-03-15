'use client'

import { getAuthToken, handleSessionExpired } from './client'

export { getAuthToken }

const DEFAULT_TIMEOUT_MS = 30_000

type AuthFetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>
  skipAuthErrorHandling?: boolean
  timeout?: number
}

export function createAuthFetch() {
  return async function authFetch(
    url: string,
    options: AuthFetchOptions = {}
  ): Promise<Response> {
    const { skipAuthErrorHandling, timeout, ...fetchOptions } = options
    const token = await getAuthToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const timeoutMs = timeout ?? DEFAULT_TIMEOUT_MS
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let signal = fetchOptions.signal

    if (!signal && timeoutMs > 0) {
      const controller = new AbortController()
      signal = controller.signal
      timeoutId = setTimeout(
        () => controller.abort(new Error('Request timed out. Please try again.')),
        timeoutMs
      )
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal,
    })

    if (timeoutId) clearTimeout(timeoutId)

    if (!skipAuthErrorHandling && response.status === 401) {
      handleSessionExpired()
    }

    return response
  }
}

export function useAuthFetch() {
  return createAuthFetch()
}
