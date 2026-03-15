'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CardWithImage, CardSortSettings } from '@veritio/study-types'

interface DraggableCardProps {
  card: CardWithImage
  isDragging?: boolean
  settings?: CardSortSettings
}

export function DraggableCard({ card, isDragging, settings }: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hasImage = !!card.image?.url && (settings?.showCardImages ?? true)

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: 'var(--style-card-bg)',
        borderColor: 'var(--style-card-border)',
      }}
      className={`border rounded-lg shadow-sm cursor-grab active:cursor-grabbing touch-none select-none overflow-hidden ${
        isDragging ? 'opacity-50' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      {/* Card Image */}
      {hasImage && (
        <div className="w-full h-20 flex items-center justify-center" style={{ backgroundColor: 'var(--style-bg-muted)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.image!.url}
            alt={card.image!.alt || card.label}
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        </div>
      )}
      {/* Card Content */}
      <div className={hasImage ? 'p-3' : 'p-4'}>
        <p className="font-medium" style={{ color: 'var(--style-text-primary)' }}>{card.label}</p>
        {(settings?.showCardDescriptions ?? true) && card.description && (
          <p className="text-sm mt-1" style={{ color: 'var(--style-text-secondary)' }}>{card.description}</p>
        )}
      </div>
    </div>
  )
}
