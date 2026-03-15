'use client'

import { useEffect, useRef } from 'react'
import { useValidationHighlightStore } from '@/stores/validation-highlight-store'

/** Scrolls element into view and applies highlight animation when validation triggers. */
export function useValidationHighlight(itemId: string) {
  const ref = useRef<HTMLDivElement>(null)
  const highlightedItemId = useValidationHighlightStore((state) => state.highlightedItemId)
  const clearHighlight = useValidationHighlightStore((state) => state.clearHighlight)

  const isHighlighted = highlightedItemId === itemId

  useEffect(() => {
    if (isHighlighted && ref.current) {
      const scrollTimer = setTimeout(() => {
        ref.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 100)

      const clearTimer = setTimeout(() => {
        clearHighlight()
      }, 2500)

      return () => {
        clearTimeout(scrollTimer)
        clearTimeout(clearTimer)
      }
    }
  }, [isHighlighted, clearHighlight])

  return {
    ref,
    isHighlighted,
    highlightClassName: isHighlighted ? 'animate-validation-highlight' : '',
  }
}
