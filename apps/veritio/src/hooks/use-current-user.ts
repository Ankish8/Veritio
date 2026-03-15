import useSWR from 'swr'
import { getAuthFetchInstance } from '@/lib/swr'

interface CurrentUser {
  id: string
  email: string
  name: string | null
  image: string | null
}

interface UseCurrentUserResult {
  user: CurrentUser | null
  isLoading: boolean
  error: Error | null
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const authFetch = getAuthFetchInstance()
  const response = await authFetch('/api/user/me')

  if (!response.ok) {
    // 401 means not authenticated - return null, don't throw
    if (response.status === 401) {
      return null
    }
    // Let non-auth errors propagate so SWR can retry.
    // Without this, a temporary 503 returns null → UserButton hides
    // the logout button → user gets stuck with no way to sign out.
    throw new Error(`Failed to fetch user: ${response.status}`)
  }

  return response.json()
}

/** Returns the current authenticated user, or null if not authenticated. */
export function useCurrentUser(): UseCurrentUserResult {
  const { data, error, isLoading } = useSWR<CurrentUser | null>(
    'current-user',
    fetchCurrentUser,
    {
      // Revalidate less frequently for user data (it rarely changes)
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Don't retry on 401 (expected when not logged in)
      shouldRetryOnError: (err) => {
        return err?.status !== 401
      },
    }
  )

  return {
    user: data ?? null,
    isLoading,
    error: error ?? null,
  }
}
