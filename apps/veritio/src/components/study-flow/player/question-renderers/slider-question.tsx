'use client'

import { useState, useRef, useCallback } from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'
import { KeyboardHintText } from '../option-keyboard-hint'
import type { SliderQuestionConfig } from '@veritio/study-types/study-flow-types'

interface SliderQuestionProps {
  config: SliderQuestionConfig
  value: number | undefined
  onChange: (value: number) => void
  showKeyboardHints?: boolean
  onSelectionComplete?: () => void
}

export function SliderQuestion({
  config,
  value,
  onChange,
  showKeyboardHints = false,
  onSelectionComplete,
}: SliderQuestionProps) {
  const minValue = config.minValue ?? 0
  const maxValue = config.maxValue ?? 100
  const step = config.step ?? 1
  const showTicks = config.showTicks ?? false
  const showValue = config.showValue ?? true

  // Track if user has interacted (for "required" validation)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)

  // Current value to display (use min if no value yet)
  const displayValue = value ?? minValue

  // Calculate tick positions
  const tickCount = showTicks ? Math.min(Math.floor((maxValue - minValue) / step) + 1, 11) : 0
  const ticks = showTicks
    ? Array.from({ length: tickCount }, (_, i) => {
        const tickValue = minValue + (i * (maxValue - minValue)) / (tickCount - 1)
        return Math.round(tickValue / step) * step
      })
    : []

  // Handle value change
  const handleValueChange = useCallback((newValue: number[]) => {
    const val = newValue[0]
    setHasInteracted(true)
    onChange(val)
  }, [onChange])

  // Handle drag start
  const handlePointerDown = useCallback(() => {
    setIsDragging(true)
    setShowTooltip(true)
  }, [])

  // Handle drag end - trigger auto-advance
  const handlePointerUp = useCallback(() => {
    setIsDragging(false)

    // Keep tooltip visible briefly after drag
    setTimeout(() => {
      if (!isDragging) {
        setShowTooltip(false)
      }
    }, 400)

    // Signal selection complete immediately - the useAutoAdvance hook handles the delay
    if (hasInteracted && onSelectionComplete) {
      onSelectionComplete()
    }
  }, [hasInteracted, isDragging, onSelectionComplete])

  // Handle keyboard number input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Number keys for direct value input (0-9)
    if (e.key >= '0' && e.key <= '9') {
      const digit = parseInt(e.key, 10)
      // For 0-100 scale, allow building a number
      const currentStr = String(displayValue)
      const newStr = currentStr + digit
      const newValue = Math.min(maxValue, Math.max(minValue, parseInt(newStr.slice(-3), 10)))
      setHasInteracted(true)
      onChange(newValue)
    }
  }, [displayValue, maxValue, minValue, onChange])


  return (
    <div className="space-y-4 py-2">
      {/* Slider with larger touch target */}
      <div
        ref={sliderRef}
        className="relative px-3 py-4"
        onKeyDown={handleKeyDown}
      >
        <SliderPrimitive.Root
          value={[displayValue]}
          onValueChange={handleValueChange}
          min={minValue}
          max={maxValue}
          step={step}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          className="relative flex w-full touch-none select-none items-center"
        >
          <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
            <SliderPrimitive.Range className="absolute h-full transition-all bg-primary" />
          </SliderPrimitive.Track>

          <SliderPrimitive.Thumb
            className={cn(
              'block h-6 w-6 rounded-full border-2 bg-background border-primary',
              'ring-offset-background transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50',
              'cursor-grab active:cursor-grabbing',
              // Larger touch target via pseudo-element
              'after:absolute after:-inset-3 after:content-[""]'
            )}
          >
            {/* Value tooltip */}
            {showValue && (showTooltip || isDragging) && (
              <div
                className={cn(
                  'absolute -top-10 left-1/2 -translate-x-1/2',
                  'px-2.5 py-1 rounded-md',
                  'bg-foreground text-background text-sm font-medium',
                  'shadow-lg',
                  'transition-opacity duration-150',
                  showTooltip || isDragging ? 'opacity-100' : 'opacity-0'
                )}
              >
                {displayValue}
                {/* Tooltip arrow */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
              </div>
            )}
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Root>

        {/* Tick marks */}
        {showTicks && ticks.length > 0 && (
          <div className="absolute left-3 right-3 top-[calc(50%+8px)] flex justify-between pointer-events-none">
            {ticks.map((tick, i) => (
              <div
                key={i}
                className="flex flex-col items-center"
              >
                <div className="w-0.5 h-2 rounded-full bg-muted-foreground/30" />
                <span className="text-[12px] mt-1 text-muted-foreground">
                  {tick}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="flex items-start justify-between text-sm text-muted-foreground px-3">
        <div className="flex-1 text-left">
          {config.leftLabel && (
            <span>{config.leftLabel}</span>
          )}
          {!config.leftLabel && (
            <span className="font-medium">{minValue}</span>
          )}
        </div>

        {config.middleLabel && (
          <div className="flex-1 text-center">
            <span>{config.middleLabel}</span>
          </div>
        )}

        <div className="flex-1 text-right">
          {config.rightLabel && (
            <span>{config.rightLabel}</span>
          )}
          {!config.rightLabel && (
            <span className="font-medium">{maxValue}</span>
          )}
        </div>
      </div>


      {/* Keyboard hints */}
      {showKeyboardHints && (
        <KeyboardHintText>
          Use arrow keys to adjust, or type a number directly
        </KeyboardHintText>
      )}
    </div>
  )
}
