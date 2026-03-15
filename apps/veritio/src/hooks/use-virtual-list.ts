import { useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export interface UseVirtualListOptions<T> {
  /** Array of items to virtualize */
  items: T[]
  /** Estimated height of each item in pixels */
  estimateSize?: number
  /** Number of items to render outside visible area */
  overscan?: number
  /** Enable dynamic height measurement */
  measureElement?: boolean
  /** Get unique key for each item */
  getItemKey?: (index: number) => string | number
}

export interface UseVirtualListReturn<T> {
  /** Ref to attach to the scroll container */
  parentRef: React.RefObject<HTMLDivElement | null>
  /** Virtual items to render */
  virtualItems: Array<{
    key: React.Key
    index: number
    start: number
    size: number
    item: T
  }>
  /** Total height of all items (for container sizing) */
  totalSize: number
  /** Scroll to a specific index */
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }) => void
  /** Measure element (call when item height changes) */
  measureElement: (element: Element | null) => void
  /** Whether the list is currently scrolling */
  isScrolling: boolean
}

/** Virtualizes long lists using @tanstack/react-virtual for efficient rendering. */
export function useVirtualList<T>({
  items,
  estimateSize = 48,
  overscan = 5,
  measureElement: enableMeasure = false,
  getItemKey,
}: UseVirtualListOptions<T>): UseVirtualListReturn<T> {
  const parentRef = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey ?? ((index) => index),
    measureElement: enableMeasure ? (element) => element?.getBoundingClientRect().height ?? estimateSize : undefined,
  })

  const virtualItems = virtualizer.getVirtualItems().map((virtualItem) => ({
    key: virtualItem.key,
    index: virtualItem.index,
    start: virtualItem.start,
    size: virtualItem.size,
    item: items[virtualItem.index],
  }))

  const scrollToIndex = useCallback(
    (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }) => {
      virtualizer.scrollToIndex(index, options)
    },
    [virtualizer]
  )

  return {
    parentRef,
    virtualItems,
    totalSize: virtualizer.getTotalSize(),
    scrollToIndex,
    measureElement: virtualizer.measureElement,
    isScrolling: virtualizer.isScrolling,
  }
}

export const VIRTUAL_LIST_PRESETS = {
  /** Standard table row (48px height) */
  tableRow: { estimateSize: 48, overscan: 10 },
  /** Compact list item (36px height) */
  compactItem: { estimateSize: 36, overscan: 15 },
  /** Card item (variable height, ~120px) */
  card: { estimateSize: 120, overscan: 3, measureElement: true },
  /** Text response (variable height, ~80px) */
  textResponse: { estimateSize: 80, overscan: 5, measureElement: true },
} as const
