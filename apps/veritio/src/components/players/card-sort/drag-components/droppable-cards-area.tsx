'use client'

import { useDroppable } from '@dnd-kit/core'

interface DroppableCardsAreaProps {
  children: React.ReactNode
}

export function DroppableCardsArea({ children }: DroppableCardsAreaProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'available-cards-drop-zone' })

  return (
    <div
      ref={setNodeRef}
      className="min-h-[200px] transition-colors rounded-lg"
      style={
        isOver ? {
          backgroundColor: 'var(--brand-subtle)',
          boxShadow: `inset 0 0 0 2px var(--brand)`,
        } : undefined
      }
    >
      {children}
    </div>
  )
}
