import type { GetTokenFn } from './types'

const API_BASE = '/api'

export async function fetchApi<T>(
  path: string,
  getToken: GetTokenFn | null,
  options: RequestInit = {}
): Promise<{ data: T | null; error: Error | null }> {
  try {
    // Get auth token if available
    const token = getToken ? await getToken() : null

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return { data: null, error: new Error(errorData.error || `HTTP ${response.status}`) }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
  }
}
