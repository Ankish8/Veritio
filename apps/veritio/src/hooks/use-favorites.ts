'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import type { FavoriteWithEntity, FavoriteEntityType } from '@veritio/study-types'
import { SWR_KEYS, getAuthFetchInstance } from '@/lib/swr'
import { invalidateCache } from '@/lib/swr/cache-invalidation'

/** Fetches and manages user favorites with SWR caching. */
export function useFavorites(limit: number = 10, initialData?: FavoriteWithEntity[]) {
  const { data: favorites, error, isLoading, mutate } = useSWR<FavoriteWithEntity[]>(
    SWR_KEYS.favorites(limit),
    null, // Uses global fetcher
    {
      fallbackData: initialData,
    }
  )

  // Auth fetch for mutations only
  const authFetch = getAuthFetchInstance()

  const toggleFavorite = useCallback(async (entityType: FavoriteEntityType, entityId: string) => {
    const response = await authFetch('/api/favorites/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId }),
    })

    if (!response.ok) {
      throw new Error('Failed to toggle favorite')
    }

    const result = await response.json()

    // Revalidate the favorites list
    mutate()

    // Use cache orchestrator to invalidate related study/project caches
    const event = result.isFavorite ? 'favorite:added' : 'favorite:removed'
    await invalidateCache(event, { [entityType + 'Id']: entityId })

    return result.isFavorite as boolean
  }, [authFetch, mutate])

  return {
    favorites: favorites || [],
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
    toggleFavorite,
  }
}

/** Checks if a specific entity is favorited. */
export function useIsFavorite(
  entityType: FavoriteEntityType,
  entityId: string,
  favorites: FavoriteWithEntity[]
): boolean {
  return favorites.some(
    f => f.entity_type === entityType && f.entity_id === entityId
  )
}
