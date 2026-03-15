'use client'

import { useState, useCallback } from 'react'
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import type { Category } from '@veritio/study-types'

interface CustomCategory {
  id: string
  label: string
}

interface PlacedCard {
  cardId: string
  categoryId: string
}

/** Special drop zone ID for creating new groups by dropping */
export const CREATE_NEW_GROUP_DROP_ZONE = '__create_new_group__'

interface UseCardSortDragStateProps {
  allCategories: (Category | CustomCategory)[]
  placedCards: PlacedCard[]
  setPlacedCards: React.Dispatch<React.SetStateAction<PlacedCard[]>>
  /** Callback to create an unnamed category and return its ID (for drop-to-create UX) */
  onCreateUnnamedCategory?: () => string
}

interface UseCardSortDragStateReturn {
  activeId: string | null
  hoveredCategoryId: string | null
  handleDragStart: (event: DragStartEvent) => void
  handleDragOver: (event: DragOverEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
}

/** Manages drag and drop state for the card sort player. */
export function useCardSortDragState({
  allCategories,
  placedCards,
  setPlacedCards,
  onCreateUnnamedCategory,
}: UseCardSortDragStateProps): UseCardSortDragStateReturn {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setHoveredCategoryId(null)
      return
    }

    const overId = over.id as string

    // Check if hovering over a category directly
    const isCategory = allCategories.some((c) => c.id === overId)
    if (isCategory) {
      setHoveredCategoryId(overId)
      return
    }

    // Check if hovering over a card inside a category
    const targetPlacement = placedCards.find((p) => p.cardId === overId)
    if (targetPlacement) {
      setHoveredCategoryId(targetPlacement.categoryId)
      return
    }

    // Hovering over something else (available cards area, etc)
    setHoveredCategoryId(null)
  }, [allCategories, placedCards])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setHoveredCategoryId(null) // Clear hover state on drop

    if (!over) return

    const cardId = active.id as string
    const overId = over.id as string

    // Check if dropped on the "available cards" area (put back)
    if (overId === 'available-cards-drop-zone') {
      // Remove from any category - card goes back to unsorted
      setPlacedCards((prev) => prev.filter((p) => p.cardId !== cardId))
      return
    }

    // Check if dropped on "create new group" zone
    if (overId === CREATE_NEW_GROUP_DROP_ZONE && onCreateUnnamedCategory) {
      // Create a new unnamed category and place the card in it
      const newCategoryId = onCreateUnnamedCategory()
      setPlacedCards((prev) => {
        const filtered = prev.filter((p) => p.cardId !== cardId)
        return [...filtered, { cardId, categoryId: newCategoryId }]
      })
      return
    }

    // Check if dropped directly on a category
    const isCategory = allCategories.some((c) => c.id === overId)

    if (isCategory) {
      // Dropped on a category directly
      setPlacedCards((prev) => {
        const filtered = prev.filter((p) => p.cardId !== cardId)
        return [...filtered, { cardId, categoryId: overId }]
      })
      return
    }

    // Check if dropped on a card that's inside a category
    // Find which category contains the card we dropped on
    const targetPlacement = placedCards.find((p) => p.cardId === overId)
    if (targetPlacement) {
      // The overId is a card inside a category - use that category as the target
      setPlacedCards((prev) => {
        const filtered = prev.filter((p) => p.cardId !== cardId)
        return [...filtered, { cardId, categoryId: targetPlacement.categoryId }]
      })
      return
    }

    // If we dropped on an available card (in the left panel), do nothing
    // The card stays where it was
  }, [allCategories, placedCards, setPlacedCards, onCreateUnnamedCategory])

  return {
    activeId,
    hoveredCategoryId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
