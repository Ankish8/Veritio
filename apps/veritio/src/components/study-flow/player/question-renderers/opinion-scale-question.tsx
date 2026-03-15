'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { KeyboardHintText } from '../option-keyboard-hint'
import type { OpinionScaleQuestionConfig } from '@veritio/study-types/study-flow-types'
import { Star } from 'lucide-react'

interface OpinionScaleQuestionProps {
  config: OpinionScaleQuestionConfig
  value: number | undefined
  onChange: (value: number) => void
  showKeyboardHints?: boolean
  onSelectionComplete?: () => void
}

function getEmotionEmoji(position: number): string {
  // Map position to 5 emotion levels
  if (position <= 0.2) return '😞'      // Very unhappy
  if (position <= 0.4) return '😕'      // Slightly unhappy
  if (position <= 0.6) return '😐'      // Neutral
  if (position <= 0.8) return '🙂'      // Slightly happy
  return '😊'                            // Very happy
}

export function OpinionScaleQuestion({
  config,
  value,
  onChange,
  showKeyboardHints = false,
  onSelectionComplete,
}: OpinionScaleQuestionProps) {
  const scalePoints = config.scalePoints || 5
  const startAtZero = config.startAtZero ?? false
  const scaleType = config.scaleType || 'stars'

  // Generate scale values array
  const startValue = startAtZero ? 0 : 1
  const scaleValues = Array.from(
    { length: scalePoints },
    (_, i) => startValue + i
  )

  const [hoveredStar, setHoveredStar] = useState<number | undefined>(undefined)

  const handleSelect = (scaleValue: number) => {
    onChange(scaleValue)
    onSelectionComplete?.()
  }

  return (
    <div className="space-y-4">
      {/* Scale buttons using CSS Grid for responsiveness */}
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${scalePoints}, minmax(44px, 1fr))`,
        }}
        onMouseLeave={scaleType === 'stars' ? () => setHoveredStar(undefined) : undefined}
      >
        {scaleValues.map((scaleValue, index) => {
          const isSelected = value === scaleValue
          // For stars, fill all stars up to the selected or hovered value (cumulative)
          const activeStarValue = hoveredStar !== undefined ? hoveredStar : value
          const isStarFilled = scaleType === 'stars' && activeStarValue !== undefined && scaleValue <= activeStarValue
          const position = index / (scalePoints - 1) // 0 to 1

          return (
            <button
              key={scaleValue}
              type="button"
              onClick={() => handleSelect(scaleValue)}
              onMouseEnter={scaleType === 'stars' ? () => setHoveredStar(scaleValue) : undefined}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl transition-all',
                'min-h-[56px] min-w-[44px] p-2',
                scaleType !== 'stars' && 'hover:bg-muted',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1',
                'border',
                scaleType === 'stars'
                  ? (isStarFilled ? 'border-transparent' : 'bg-transparent border-border/50')
                  : (isSelected ? 'bg-muted border-transparent' : 'bg-transparent border-border/50')
              )}
            >
              {/* Legacy numerical/number support for backwards compatibility */}
              {(scaleType === 'numerical' || (scaleType as string) === 'number') && (
                <span className={cn(
                  'font-semibold text-lg',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}>
                  {scaleValue}
                </span>
              )}

              {scaleType === 'stars' && (
                <Star
                  className={cn(
                    'h-7 w-7 transition-colors',
                    isStarFilled
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/50'
                  )}
                />
              )}

              {scaleType === 'emotions' && (
                <span className="text-3xl">
                  {getEmotionEmoji(position)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Keyboard hints */}
      {showKeyboardHints && (
        <KeyboardHintText>
          Press 1-{scalePoints} or {String.fromCharCode(65)}-{String.fromCharCode(65 + scalePoints - 1)} to select
        </KeyboardHintText>
      )}
    </div>
  )
}
