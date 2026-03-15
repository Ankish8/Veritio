'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { SWR_KEYS, getAuthFetchInstance } from '../lib/swr'
import type {
  UserPreferences,
  UserPreferencesUpdate,
  DeepPartial,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'

function deepMerge<T extends Record<string, any>>(
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
        result[key] = deepMerge(result[key], source[key] as any)
      } else {
        result[key] = source[key] as any
      }
    }
  }
  return result
}

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
      const optimisticData = data ? deepMerge(data, updates as DeepPartial<UserPreferences>) : undefined

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
          optimisticData,
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

  const updateDashboard = useCallback(
    (updates: UserPreferencesUpdate['dashboard']) =>
      updatePreferences({ dashboard: updates }),
    [updatePreferences]
  )

  const updateNotifications = useCallback(
    (updates: UserPreferencesUpdate['notifications']) =>
      updatePreferences({ notifications: updates }),
    [updatePreferences]
  )

  const updatePrivacy = useCallback(
    (updates: UserPreferencesUpdate['privacy']) =>
      updatePreferences({ privacy: updates }),
    [updatePreferences]
  )

  return {
    preferences: data || null,
    isLoading,
    error: error?.message || null,
    updatePreferences,
    updateProfile,
    updateStudyDefaults,
    updateDashboard,
    updateNotifications,
    updatePrivacy,
    refetch: () => mutate(),
  }
}
