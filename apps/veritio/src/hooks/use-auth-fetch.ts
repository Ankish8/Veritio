'use client'

import { getAuthFetchInstance } from '@/lib/swr'

export function useAuthFetch() {
  return getAuthFetchInstance()
}
