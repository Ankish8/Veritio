'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import useSWR from 'swr'
import { useAuthFetch } from './use-auth-fetch'

export interface ToolkitInfo {
  slug: string
  name: string
  description: string
  logo: string
  categories: string[]
}

interface ToolkitsResponse {
  configured: boolean
  toolkits: ToolkitInfo[]
  nextCursor: string | null
  total: number
  categories: string[]
}

/**
 * Hook to fetch and search available Composio toolkits with cursor-based pagination.
 */
export function useComposioToolkits(initialSearch = '', limit = 20) {
  const authFetch = useAuthFetch()
  const [search, setSearch] = useState(initialSearch)
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch)
  const [allToolkits, setAllToolkits] = useState<ToolkitInfo[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<Error | null>(null)
  const prevSearchRef = useRef(debouncedSearch)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset when search changes
  useEffect(() => {
    if (prevSearchRef.current !== debouncedSearch) {
      setAllToolkits([])  
      setCursor(null)  
      setLoadMoreError(null)  
      prevSearchRef.current = debouncedSearch
    }
  }, [debouncedSearch])

  const swrKey = `/api/integrations/composio/toolkits?search=${encodeURIComponent(debouncedSearch)}&limit=${limit}`

  const fetcher = useCallback(
    async (url: string): Promise<ToolkitsResponse> => {
      const res = await authFetch(url)
      if (!res.ok) throw new Error('Failed to fetch toolkits')
      return res.json()
    },
    [authFetch]
  )

  const { data, error, isLoading } = useSWR<ToolkitsResponse>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  // Sync initial page data
  useEffect(() => {
    if (data?.toolkits && !cursor) {
      setAllToolkits(data.toolkits)  
      setCursor(data.nextCursor)  
    }
  }, [data, cursor])

  const loadMore = useCallback(async () => {
    if (!cursor || isLoadingMore) return

    setIsLoadingMore(true)
    setLoadMoreError(null)

    try {
      const url = `/api/integrations/composio/toolkits?search=${encodeURIComponent(debouncedSearch)}&limit=${limit}&cursor=${encodeURIComponent(cursor)}`
      const res = await authFetch(url)

      if (!res.ok) {
        throw new Error('Failed to load more toolkits')
      }

      const page: ToolkitsResponse = await res.json()
      setAllToolkits((prev) => [...prev, ...page.toolkits])
      setCursor(page.nextCursor)
    } catch (err) {
      setCursor(null)
      setLoadMoreError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoadingMore(false)
    }
  }, [cursor, isLoadingMore, debouncedSearch, limit, authFetch])

  return {
    toolkits: allToolkits.length > 0 ? allToolkits : (data?.toolkits ?? []),
    isLoading,
    isLoadingMore,
    error: error || loadMoreError,
    hasMore: cursor !== null,
    loadMore,
    search,
    setSearch,
  }
}
