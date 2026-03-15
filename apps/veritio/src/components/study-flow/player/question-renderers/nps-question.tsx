'use client'

import { cn } from '@/lib/utils'
import type {
  NPSQuestionConfig,
  ScaleResponseValue,
  ResponseValue,
} from '@veritio/study-types/study-flow-types'

interface NPSRendererProps {
  config: NPSQuestionConfig
  value: ResponseValue | undefined
  onChange: (value: ScaleResponseValue) => void
  showKeyboardHints?: boolean
  onSelectionComplete?: () => void
}

export function NPSRenderer({
  config,
  value,
  onChange,
  showKeyboardHints = false,
  onSelectionComplete,
}: NPSRendererProps) {
  const npsConfig = config as NPSQuestionConfig
  const currentValue = value as ScaleResponseValue | undefined

  const handleSelect = (point: number) => {
    onChange({ value: point })
    onSelectionComplete?.()
  }

  // NPS is always 0-10
  const points = Array.from({ length: 11 }, (_, i) => i)

  return (
    <div className="space-y-4">
      {/* Endpoint labels */}
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{npsConfig.leftLabel || 'Not at all likely'}</span>
        <span>{npsConfig.rightLabel || 'Extremely likely'}</span>
      </div>

      {/* Scale buttons */}
      <div className="flex justify-between gap-1">
        {points.map((point) => {
          const isSelected = currentValue?.value === point
          return (
            <button
              key={point}
              type="button"
              onClick={() => handleSelect(point)}
              className={cn(
                'flex-1 py-3 rounded-lg border font-medium transition-colors',
                isSelected
                  ? point <= 6
                    ? 'bg-red-500 text-white border-red-500'
                    : point <= 8
                      ? 'bg-yellow-500 text-white border-yellow-500'
                      : 'bg-green-500 text-white border-green-500'
                  : 'bg-background hover:bg-muted border-border'
              )}
            >
              {point}
            </button>
          )
        })}
      </div>

      {/* Keyboard shortcuts hint */}
      {showKeyboardHints && (
        <p className="text-xs text-muted-foreground text-center hidden sm:block">
          Keyboard shortcuts: Press 0-9 to select (press 0 twice for 10)
        </p>
      )}
    </div>
  )
}
