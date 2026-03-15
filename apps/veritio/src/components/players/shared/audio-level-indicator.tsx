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
  // Calculate bar heights based on audio level
  // Each bar has a slightly different response for visual interest
  const barHeights = useMemo(() => {
    // Normalize level to 0-1 range
    const normalizedLevel = Math.min(1, audioLevel / 100)

    // Minimum height for bars (so they're always visible)
    const minHeight = 0.2

    // Calculate heights with different scaling for each bar
    // This creates a more dynamic, wave-like effect
    return [
      minHeight + (normalizedLevel * 0.7 * 0.8),  // Left bar (slightly delayed)
      minHeight + (normalizedLevel * 0.8),        // Middle bar (full response)
      minHeight + (normalizedLevel * 0.7 * 0.9),  // Right bar (slightly delayed)
    ]
  }, [audioLevel])

  if (!visible) return null

  // Color based on speaking state
  const barColor = isSpeaking ? 'var(--brand)' : 'var(--style-text-muted)'

  if (compact) {
    // Compact mode: tiny bars for integration with recording indicator
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

  // Standard mode: slightly larger bars
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
