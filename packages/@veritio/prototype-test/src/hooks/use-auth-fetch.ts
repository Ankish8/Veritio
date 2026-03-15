'use client'

import { getAuthFetchInstance } from '../lib/swr'
export function useAuthFetch() {
  // Return the singleton instance - no useMemo needed
  // The instance is lazily created and cached by getAuthFetchInstance
  return getAuthFetchInstance()
}
