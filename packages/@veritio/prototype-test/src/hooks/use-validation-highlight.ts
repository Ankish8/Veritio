'use client'

import { useEffect, useRef } from 'react'
import { useValidationHighlightStore } from '../stores/validation-highlight-store'
export function useValidationHighlight(itemId: string) {
  const ref = useRef<HTMLDivElement>(null)
  const highlightedItemId = useValidationHighlightStore((state) => state.highlightedItemId)
  const clearHighlight = useValidationHighlightStore((state) => state.clearHighlight)

  const isHighlighted = highlightedItemId === itemId

  useEffect(() => {
    if (isHighlighted && ref.current) {
      // Scroll into view with a small delay to allow tab switch animation
      const scrollTimer = setTimeout(() => {
        ref.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 100)

      // Clear highlight after animation completes
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
