'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { SWR_KEYS, getAuthFetchInstance } from '@/lib/swr'
import type {
  UserPreferences,
  UserPreferencesUpdate,
  DeepPartial,
} from '@/lib/supabase/user-preferences-types'

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: DeepPartial<T>
): T {
  const result = { ...target }
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof result[key] === 'object' &&
        result[key] !== null
      ) {
        result[key] = deepMerge(result[key] as Record<string, unknown>, source[key] as DeepPartial<Record<string, unknown>>) as T[Extract<keyof T, string>]
      } else {
        result[key] = source[key] as T[Extract<keyof T, string>]
      }
    }
  }
  return result
}

/** Manages user preferences with SWR caching, optimistic updates, and deep merge. */
export function useUserPreferences() {
  const authFetch = getAuthFetchInstance()

  const { data, error, isLoading, mutate } = useSWR<UserPreferences>(
    SWR_KEYS.userPreferences,
    async (url: string) => {
      const response = await authFetch(url)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch preferences')
      }
      return response.json()
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  const updatePreferences = useCallback(
    async (updates: UserPreferencesUpdate): Promise<void> => {
      const optimisticData = data ? deepMerge(data as unknown as Record<string, unknown>, updates as DeepPartial<Record<string, unknown>>) as unknown as UserPreferences : undefined
      await mutate(
        async () => {
          const response = await authFetch(SWR_KEYS.userPreferences, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          })

          if (!response.ok) {
            const responseText = await response.text()

            let errorMessage = 'Failed to update preferences'
            if (responseText) {
              try {
                const errorData = JSON.parse(responseText)
                errorMessage = errorData.error || errorData.message || errorMessage
              } catch {
                errorMessage = responseText.slice(0, 100) || errorMessage
              }
            }

            if (response.status === 401) {
              errorMessage = 'Session expired. Please sign out and sign in again.'
            }

            throw new Error(errorMessage)
          }

          return response.json()
        },
        {
          ...(optimisticData !== undefined && { optimisticData }),
          rollbackOnError: true,
          revalidate: false,
        }
      )
    },
    [authFetch, mutate, data]
  )

  const updateProfile = useCallback(
    (updates: UserPreferencesUpdate['profile']) =>
      updatePreferences({ profile: updates }),
    [updatePreferences]
  )

  const updateStudyDefaults = useCallback(
    (updates: UserPreferencesUpdate['studyDefaults']) =>
      updatePreferences({ studyDefaults: updates }),
    [updatePreferences]
  )

  return {
    preferences: data || null,
    isLoading,
    error: error?.message || null,
    updatePreferences,
    updateProfile,
    updateStudyDefaults,
    refetch: () => mutate(),
  }
}
