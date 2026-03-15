import useSWR from 'swr'
import { swrFetcher } from '@/lib/swr'

interface AdminCheckResponse {
  isAdmin: boolean
}

/** Returns whether the current authenticated user is a superadmin. */
export function useAdminCheck() {
  const { data, isLoading } = useSWR<AdminCheckResponse>(
    '/api/admin/check',
    swrFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  )

  return {
    isAdmin: data?.isAdmin === true,
    isLoading,
  }
}
