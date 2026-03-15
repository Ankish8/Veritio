'use client'

import { memo, useMemo } from 'react'

export interface AudioLevelIndicatorProps {
  audioLevel: number
  isSpeaking: boolean
  visible: boolean
  compact?: boolean
}

export const AudioLevelIndicator = memo(function AudioLevelIndicator({
  audioLevel,
  isSpeaking,
  visible,
  compact = false,
}: AudioLevelIndicatorProps) {
  const barHeights = useMemo(() => {
    const level = Math.min(1, audioLevel / 100)
    const min = 0.2
    return [
      min + (level * 0.56),
      min + (level * 0.8),
      min + (level * 0.63),
    ]
  }, [audioLevel])

  if (!visible) return null

  const barColor = isSpeaking ? 'var(--brand)' : 'var(--style-text-muted)'

  if (compact) {
    return (
      <div className="flex items-end gap-0.5 h-3 ml-1.5">
        {barHeights.map((height, index) => (
          <div
            key={index}
            className="w-0.5 rounded-full transition-all duration-100 ease-out"
            style={{
              height: `${height * 100}%`,
              backgroundColor: barColor,
              minHeight: '3px',
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex items-end justify-center gap-1 h-5 px-2 py-1 rounded"
      style={{
        backgroundColor: 'var(--style-card-bg)',
        border: '1px solid var(--style-card-border)',
      }}
    >
      {barHeights.map((height, index) => (
        <div
          key={index}
          className="w-1 rounded-full transition-all duration-100 ease-out"
          style={{
            height: `${height * 100}%`,
            backgroundColor: barColor,
            minHeight: '4px',
          }}
        />
      ))}
    </div>
  )
})
