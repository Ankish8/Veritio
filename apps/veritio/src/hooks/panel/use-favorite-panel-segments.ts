'use client'

import { useCallback, useMemo } from 'react'
import { useUserPreferences } from '@/hooks/use-user-preferences'

interface SegmentLike {
  id: string
  name: string
}

const EMPTY_FAVORITE_IDS: string[] = []

export function sortFavoritePanelSegments<T extends SegmentLike>(
  segments: T[],
  favoriteIds: string[]
): T[] {
  const favorites = new Set(favoriteIds)
  return [...segments].sort((left, right) => {
    const favoriteDifference =
      Number(favorites.has(right.id)) - Number(favorites.has(left.id))
    if (favoriteDifference !== 0) return favoriteDifference
    return left.name.localeCompare(right.name)
  })
}

/** Personal, cross-device favorites backed by the authenticated preferences row. */
export function useFavoritePanelSegments<T extends SegmentLike>(segments: T[]) {
  const { preferences, updateWorkspace, isLoading } = useUserPreferences()
  const favoriteIds =
    preferences?.workspace.favoritePanelSegmentIds ?? EMPTY_FAVORITE_IDS
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds])

  const sortedSegments = useMemo(
    () => sortFavoritePanelSegments(segments, favoriteIds),
    [favoriteIds, segments]
  )

  const toggleFavorite = useCallback(
    async (segmentId: string) => {
      const nextIds = favoriteIdSet.has(segmentId)
        ? favoriteIds.filter((id) => id !== segmentId)
        : [...favoriteIds, segmentId].slice(0, 500)
      await updateWorkspace({ favoritePanelSegmentIds: nextIds })
    },
    [favoriteIdSet, favoriteIds, updateWorkspace]
  )

  const removeFavorite = useCallback(
    async (segmentId: string) => {
      if (!favoriteIdSet.has(segmentId)) return
      await updateWorkspace({
        favoritePanelSegmentIds: favoriteIds.filter((id) => id !== segmentId),
      })
    },
    [favoriteIdSet, favoriteIds, updateWorkspace]
  )

  return {
    favoriteIds,
    favoriteIdSet,
    sortedSegments,
    toggleFavorite,
    removeFavorite,
    isLoading,
  }
}
