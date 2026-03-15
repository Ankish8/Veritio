'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { cn } from '@veritio/ui'

export interface VirtualParticipantListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  itemHeight: number
  keyExtractor: (item: T, index: number) => string
  overscan?: number
  containerHeight?: number | string
  onItemVisible?: (item: T, index: number) => void
  loadingComponent?: ReactNode
  emptyComponent?: ReactNode
  className?: string
  itemClassName?: string
  isLoadingMore?: boolean
  onLoadMore?: () => void
  loadMoreThreshold?: number
  totalCount?: number
}

interface VirtualItem {
  index: number
  offsetTop: number
}

export function VirtualParticipantList<T>({
  items,
  renderItem,
  itemHeight,
  keyExtractor,
  overscan = 5,
  containerHeight = 400,
  onItemVisible,
  loadingComponent,
  emptyComponent,
  className,
  itemClassName,
  isLoadingMore,
  onLoadMore,
  loadMoreThreshold = 200,
  totalCount,
}: VirtualParticipantListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set())

  // Calculate container height in pixels
  const containerHeightPx = useMemo(() => {
    if (typeof containerHeight === 'number') return containerHeight
    // For string values like '100%', we'll use a fallback
    return 400
  }, [containerHeight])

  // Calculate total height and visible range
  const totalHeight = items.length * itemHeight
  const visibleCount = Math.ceil(containerHeightPx / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeightPx) / itemHeight) + overscan
  )

  // Generate virtual items for the visible range
  const virtualItems = useMemo<VirtualItem[]>(() => {
    const result: VirtualItem[] = []
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        index: i,
        offsetTop: i * itemHeight,
      })
    }
    return result
  }, [startIndex, endIndex, itemHeight])

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    setScrollTop(target.scrollTop)

    // Check if near bottom for load more
    if (onLoadMore && !isLoadingMore) {
      const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight
      if (distanceFromBottom < loadMoreThreshold) {
        onLoadMore()
      }
    }
  }, [onLoadMore, isLoadingMore, loadMoreThreshold])

  // Track visible items for lazy loading
  useEffect(() => {
    if (!onItemVisible) return

    const newVisible = new Set<number>()
    for (let i = startIndex; i <= endIndex; i++) {
      newVisible.add(i)
      if (!visibleItems.has(i) && items[i]) {
        onItemVisible(items[i], i)
      }
    }
    setVisibleItems(newVisible)
  }, [startIndex, endIndex, items, onItemVisible, visibleItems])

  // Empty state
  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height: containerHeight }}>
        {emptyComponent || (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No participants found</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* Header with count */}
      {totalCount !== undefined && (
        <div className="text-xs text-muted-foreground mb-2 px-1">
          Showing {Math.min(endIndex + 1, items.length)} of {totalCount} participants
        </div>
      )}

      {/* Virtual scroll container */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Spacer to maintain scroll height */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Render only visible items */}
          {virtualItems.map((virtualItem) => {
            const item = items[virtualItem.index]
            if (!item) return null

            return (
              <div
                key={keyExtractor(item, virtualItem.index)}
                className={cn('absolute left-0 right-0', itemClassName)}
                style={{
                  top: virtualItem.offsetTop,
                  height: itemHeight,
                }}
              >
                {renderItem(item, virtualItem.index)}
              </div>
            )
          })}
        </div>

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="sticky bottom-0 left-0 right-0 flex justify-center py-2 bg-gradient-to-t from-background to-transparent">
            {loadingComponent || (
              <div className="text-sm text-muted-foreground">Loading more...</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface IntersectionListProps<T> {
  items: T[]
  renderItem: (item: T, index: number, isVisible: boolean) => ReactNode
  keyExtractor: (item: T, index: number) => string
  rootMargin?: string
  threshold?: number | number[]
  onItemVisible?: (item: T, index: number) => void
  className?: string
  itemClassName?: string
  emptyComponent?: ReactNode
}
export function IntersectionList<T>({
  items,
  renderItem,
  keyExtractor,
  rootMargin = '100px',
  threshold = 0,
  onItemVisible,
  className,
  itemClassName,
  emptyComponent,
}: IntersectionListProps<T>) {
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Set up intersection observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = entry.target.getAttribute('data-key')
          if (!key) return

          setVisibleItems((prev) => {
            const next = new Set(prev)
            if (entry.isIntersecting) {
              if (!next.has(key)) {
                next.add(key)
                // Find the item and call callback
                const index = items.findIndex((item, i) => keyExtractor(item, i) === key)
                if (index !== -1 && onItemVisible) {
                  onItemVisible(items[index], index)
                }
              }
            }
            return next
          })
        })
      },
      { rootMargin, threshold }
    )

    return () => {
      observerRef.current?.disconnect()
    }
  }, [items, keyExtractor, onItemVisible, rootMargin, threshold])

  // Observe items
  const setItemRef = useCallback((key: string) => {
    return (el: HTMLDivElement | null) => {
      if (el) {
        itemRefs.current.set(key, el)
        observerRef.current?.observe(el)
      } else {
        const existingEl = itemRefs.current.get(key)
        if (existingEl) {
          observerRef.current?.unobserve(existingEl)
          itemRefs.current.delete(key)
        }
      }
    }
  }, [])

  if (items.length === 0) {
    return emptyComponent || (
      <div className={cn('text-center text-muted-foreground py-8', className)}>
        <p className="text-sm">No items found</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {items.map((item, index) => {
        const key = keyExtractor(item, index)
        const isVisible = visibleItems.has(key)

        return (
          <div
            key={key}
            ref={setItemRef(key)}
            data-key={key}
            className={itemClassName}
          >
            {renderItem(item, index, isVisible)}
          </div>
        )
      })}
    </div>
  )
}

interface UseLazyLoadOptions {
  batchSize?: number
  initialCount?: number
}

interface UseLazyLoadResult<T> {
  loadedItems: T[]
  hasMore: boolean
  isLoading: boolean
  loadMore: () => void
  reset: () => void
}

export function useLazyLoad<T>(
  allItems: T[],
  options: UseLazyLoadOptions = {}
): UseLazyLoadResult<T> {
  const { batchSize = 20, initialCount = 20 } = options
  const [loadedCount, setLoadedCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)

  const loadedItems = useMemo(
    () => allItems.slice(0, loadedCount),
    [allItems, loadedCount]
  )

  const hasMore = loadedCount < allItems.length

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    // Simulate async loading (useful for UI feedback)
    setTimeout(() => {
      setLoadedCount((prev) => Math.min(prev + batchSize, allItems.length))
      setIsLoading(false)
    }, 100)
  }, [isLoading, hasMore, batchSize, allItems.length])

  const reset = useCallback(() => {
    setLoadedCount(initialCount)
    setIsLoading(false)
  }, [initialCount])

  // Reset when source data changes
  useEffect(() => {
    setLoadedCount(Math.min(initialCount, allItems.length))
  }, [allItems.length, initialCount])

  return {
    loadedItems,
    hasMore,
    isLoading,
    loadMore,
    reset,
  }
}
