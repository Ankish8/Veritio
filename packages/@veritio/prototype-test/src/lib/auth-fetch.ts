'use client'

import { getAuthToken, handleSessionExpired } from './auth-client'

// Re-export for convenience
export { getAuthToken }
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
    const { skipAuthErrorHandling, ...fetchOptions } = options
    const token = await getAuthToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    // Handle session expiration for mutations (POST, PATCH, DELETE, etc.)
    // SWR GET requests are handled by SWRProvider's onError
    if (!skipAuthErrorHandling && response.status === 401) {
      handleSessionExpired()
    }

    return response
  }
}
export function useAuthFetch() {
  return createAuthFetch()
}
