'use client'

import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { KeyboardHintText } from '../option-keyboard-hint'
import type {
  SemanticDifferentialQuestionConfig,
  SemanticDifferentialResponseValue,
  SemanticDifferentialScale,
} from '@veritio/study-types/study-flow-types'

interface SemanticDifferentialQuestionProps {
  config: SemanticDifferentialQuestionConfig
  value: SemanticDifferentialResponseValue | undefined
  onChange: (value: SemanticDifferentialResponseValue) => void
  showKeyboardHints?: boolean
  onSelectionComplete?: () => void
}

function shuffleArray<T>(array: T[], seed: number): T[] {
  const result = [...array]
  let currentIndex = result.length
  let randomValue = seed

  while (currentIndex > 0) {
    // Simple pseudo-random number generator
    randomValue = (randomValue * 9301 + 49297) % 233280
    const randomIndex = Math.floor((randomValue / 233280) * currentIndex)
    currentIndex--
    ;[result[currentIndex], result[randomIndex]] = [result[randomIndex], result[currentIndex]]
  }

  return result
}

export function SemanticDifferentialQuestion({
  config,
  value,
  onChange,
  showKeyboardHints = false,
  onSelectionComplete,
}: SemanticDifferentialQuestionProps) {
  const scalePoints = config.scalePoints ?? 7
  const showMiddleLabel = config.showMiddleLabel ?? true
  const middleLabel = config.middleLabel ?? 'Neutral'
  const showNumbers = config.showNumbers ?? false
  const randomizeScales = config.randomizeScales ?? false

  // Current response value (wrapped in useMemo for stable reference)
  const currentValue = useMemo<SemanticDifferentialResponseValue>(() => value || {}, [value])

  // Track focused scale for keyboard navigation
  const [focusedScaleIndex, setFocusedScaleIndex] = useState<number | null>(null)

  // Calculate scale range (centered around 0)
  const halfRange = Math.floor(scalePoints / 2)
  const scaleValues = Array.from({ length: scalePoints }, (_, i) => i - halfRange)

  // Randomize scales if enabled (stable per question)
  const scales = useMemo(() => config.scales ?? [], [config.scales])
  const displayScales = useMemo(() => {
    if (!randomizeScales || scales.length === 0) return scales
    // Use first scale ID as seed for consistent randomization
    const seed = scales[0]?.id.charCodeAt(0) || 42
    return shuffleArray(scales, seed)
  }, [scales, randomizeScales])

  // Handle selection for a scale
  const handleSelect = useCallback((scaleId: string, selectedValue: number) => {
    const newValue = {
      ...currentValue,
      [scaleId]: selectedValue,
    }
    onChange(newValue)

    // Check if all scales are answered
    const allAnswered = displayScales.every((scale) => newValue[scale.id] !== undefined)
    if (allAnswered && onSelectionComplete) {
      // Don't auto-advance for semantic differential (per user decision)
      // But signal completion for validation
    }
  }, [currentValue, onChange, displayScales, onSelectionComplete])

  // Keyboard handler for the focused scale
  const handleKeyDown = useCallback((e: React.KeyboardEvent, scaleId: string) => {
    // Number keys 1-9 map to scale values
    if (e.key >= '1' && e.key <= '9') {
      const keyIndex = parseInt(e.key, 10) - 1
      if (keyIndex < scalePoints) {
        const selectedValue = scaleValues[keyIndex]
        handleSelect(scaleId, selectedValue)
        e.preventDefault()
      }
    }

    // Arrow keys for navigation
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const currentScaleValue = currentValue[scaleId]
      if (currentScaleValue !== undefined) {
        const currentIndex = scaleValues.indexOf(currentScaleValue)
        let newIndex = currentIndex

        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          newIndex = currentIndex - 1
        } else if (e.key === 'ArrowRight' && currentIndex < scalePoints - 1) {
          newIndex = currentIndex + 1
        }

        if (newIndex !== currentIndex) {
          handleSelect(scaleId, scaleValues[newIndex])
          e.preventDefault()
        }
      } else {
        // No selection yet, start from middle
        handleSelect(scaleId, 0)
        e.preventDefault()
      }
    }
  }, [currentValue, handleSelect, scalePoints, scaleValues])

  return (
    <div className="space-y-3">
      {/* Scale header row with numbers */}
      {showNumbers && (
        <div className="hidden sm:grid" style={{ gridTemplateColumns: `1fr repeat(${scalePoints}, minmax(32px, 1fr)) 1fr` }}>
          <div /> {/* Empty cell for left label */}
          {scaleValues.map((val) => (
            <div key={val} className="text-center text-xs text-muted-foreground">
              {val > 0 ? `+${val}` : val}
            </div>
          ))}
          <div /> {/* Empty cell for right label */}
        </div>
      )}

      {/* Scales */}
      <div className="space-y-1">
        {displayScales.map((scale, index) => (
          <ScaleRow
            key={scale.id}
            scale={scale}
            scalePoints={scalePoints}
            scaleValues={scaleValues}
            selectedValue={currentValue[scale.id]}
            onSelect={(val) => handleSelect(scale.id, val)}
            onKeyDown={(e) => handleKeyDown(e, scale.id)}
            showNumbers={showNumbers}
            isFocused={focusedScaleIndex === index}
            onFocus={() => setFocusedScaleIndex(index)}
            onBlur={() => setFocusedScaleIndex(null)}
          />
        ))}
      </div>

      {/* Middle label */}
      {showMiddleLabel && middleLabel && (
        <div className="text-center pt-1">
          <span className="text-xs text-muted-foreground/60">
            Center = {middleLabel}
          </span>
        </div>
      )}

      {/* Keyboard hints */}
      {showKeyboardHints && (
        <KeyboardHintText>
          Press 1-{scalePoints} to select, arrow keys to adjust
        </KeyboardHintText>
      )}
    </div>
  )
}

interface ScaleRowProps {
  scale: SemanticDifferentialScale
  scalePoints: number
  scaleValues: number[]
  selectedValue: number | undefined
  onSelect: (value: number) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  showNumbers: boolean
  isFocused: boolean
  onFocus: () => void
  onBlur: () => void
}

function ScaleRow({
  scale,
  scaleValues,
  selectedValue,
  onSelect,
  onKeyDown,
  showNumbers,
  onFocus,
  onBlur,
}: ScaleRowProps) {
  return (
    <div
      className="focus:outline-none py-1.5"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {/* Compact horizontal layout */}
      <div className="flex items-center gap-3">
        {/* Left label - fixed width for alignment */}
        <span className="text-sm text-foreground/70 w-32 text-left shrink-0">
          {scale.leftLabel}
        </span>

        {/* Scale points - compact spacing */}
        <div className="flex items-center gap-1.5 flex-1 justify-center">
          {scaleValues.map((val) => (
            <ScalePoint
              key={val}
              value={val}
              isSelected={selectedValue === val}
              isCenter={val === 0}
              onSelect={() => onSelect(val)}
              showNumber={showNumbers}
              size="sm"
            />
          ))}
        </div>

        {/* Right label - fixed width for alignment */}
        <span className="text-sm text-foreground w-32 text-right shrink-0">
          {scale.rightLabel}
        </span>
      </div>
    </div>
  )
}

interface ScalePointProps {
  value: number
  isSelected: boolean
  isCenter: boolean
  onSelect: () => void
  showNumber: boolean
  size: 'xs' | 'sm' | 'md'
}

function ScalePoint({
  value,
  isSelected,
  onSelect,
  size,
}: ScalePointProps) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
  }[size]

  const innerSizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  }[size]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'rounded-full border-2 flex items-center justify-center transition-colors',
        'cursor-pointer',
        sizeClasses,
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1',
        isSelected
          ? 'border-primary bg-primary'
          : 'border-border hover:border-primary/60'
      )}
      aria-pressed={isSelected}
      aria-label={`Select ${value > 0 ? '+' : ''}${value}`}
    >
      {isSelected && (
        <div className={cn('rounded-full bg-primary-foreground', innerSizeClasses)} />
      )}
    </button>
  )
}
