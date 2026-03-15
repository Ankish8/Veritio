'use client'

import type { CardWithImage, CardSortSettings } from '@veritio/study-types'

interface CardOverlayProps {
  card: CardWithImage
  settings?: CardSortSettings
}

export function CardOverlay({ card, settings }: CardOverlayProps) {
  return (
    <div
      className="border-2 rounded-lg p-4 shadow-xl cursor-grabbing"
      style={{
        backgroundColor: 'var(--style-card-bg)',
        borderColor: 'var(--brand)',
      }}
    >
      <p className="font-medium" style={{ color: 'var(--style-text-primary)' }}>{card.label}</p>
      {(settings?.showCardDescriptions ?? true) && card.description && (
        <p className="text-sm mt-1" style={{ color: 'var(--style-text-secondary)' }}>{card.description}</p>
      )}
    </div>
  )
}
