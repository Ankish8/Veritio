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
    // @container lets each row switch between a stacked (labels above the
    // scale) and inline (labels beside the scale) layout based on the actual
    // rendered width, not the viewport, so it stays readable inside the narrow
    // builder preview frame, on phones, and in the wide player alike.
    <div className="@container space-y-3">
      {/* Scales */}
      <div className="space-y-2">
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
            isFirst={index === 0}
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
  isFirst: boolean
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
  isFirst,
  onFocus,
  onBlur,
}: ScaleRowProps) {
  const columns = `repeat(${scaleValues.length}, minmax(0, 1fr))`

  return (
    <div
      className="focus:outline-none rounded-lg py-1 @lg:py-1.5"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {/*
        Narrow container  -> stacked: [left ........ right] label row, then a
        full-width scale grid underneath. Inline (@lg) -> [left | scale | right].
        Both left/right labels can shrink and wrap, and the scale points sit in
        a min-w-0 grid so they never force horizontal overflow.
      */}
      <div className="flex flex-col gap-1 @lg:flex-row @lg:items-center @lg:gap-3">
        {/* Stacked label row (narrow only) */}
        <div className="flex items-start justify-between gap-3 @lg:hidden">
          <span className="min-w-0 flex-1 text-xs font-medium text-foreground/70 text-left break-words leading-tight">
            {scale.leftLabel}
          </span>
          <span className="min-w-0 flex-1 text-xs font-medium text-foreground text-right break-words leading-tight">
            {scale.rightLabel}
          </span>
        </div>

        {/* Inline left label (@lg only) */}
        <span className="hidden @lg:block w-32 shrink-0 text-sm text-foreground/70 text-left break-words leading-tight">
          {scale.leftLabel}
        </span>

        {/* Scale points */}
        <div className="min-w-0 flex-1">
          {showNumbers && isFirst && (
            <div
              className="grid gap-1 sm:gap-1.5 mb-1"
              style={{ gridTemplateColumns: columns }}
            >
              {scaleValues.map((val) => (
                <div key={val} className="text-center text-[10px] leading-none text-muted-foreground">
                  {val > 0 ? `+${val}` : val}
                </div>
              ))}
            </div>
          )}
          <div
            className="grid gap-1 sm:gap-1.5 justify-items-center"
            style={{ gridTemplateColumns: columns }}
          >
            {scaleValues.map((val) => (
              <ScalePoint
                key={val}
                value={val}
                isSelected={selectedValue === val}
                isCenter={val === 0}
                onSelect={() => onSelect(val)}
              />
            ))}
          </div>
        </div>

        {/* Inline right label (@lg only) */}
        <span className="hidden @lg:block w-32 shrink-0 text-sm text-foreground text-right break-words leading-tight">
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
}

function ScalePoint({
  value,
  isSelected,
  onSelect,
}: ScalePointProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        // Fluid size: fills its grid cell but never grows past 2rem and shrinks
        // below it when the container is narrow, so N points always fit.
        'aspect-square w-full max-w-[2rem] rounded-full border-2 flex items-center justify-center transition-colors',
        'cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1',
        isSelected
          ? 'border-primary bg-primary'
          : 'border-border hover:border-primary/60'
      )}
      aria-pressed={isSelected}
      aria-label={`Select ${value > 0 ? '+' : ''}${value}`}
    >
      {isSelected && (
        <div className="w-[45%] aspect-square rounded-full bg-primary-foreground" />
      )}
    </button>
  )
}
