'use client'

/**
 * ClipRangeSelector Component
 *
 * A visual range selector using Radix UI Slider with dual thumbs.
 * Used for selecting clip start/end times in the ClipsTab.
 */

import { useCallback, useMemo } from 'react'
import { Slider } from '@/components/ui/slider'
import { cn, formatDuration } from '@/lib/utils'

export interface ClipRangeSelectorProps {
  /** Total duration in milliseconds */
  durationMs: number
  /** Start time in milliseconds */
  startMs: number
  /** End time in milliseconds */
  endMs: number
  /** Callback when range changes */
  onChange: (range: { startMs: number; endMs: number }) => void
  /** Minimum clip duration in ms (default: 1000ms = 1 second) */
  minDurationMs?: number
  /** Maximum clip duration in ms (default: no limit) */
  maxDurationMs?: number
  /** Whether the selector is disabled */
  disabled?: boolean
  /** Optional className */
  className?: string
}

/**
 * Visual clip range selector with dual-thumb slider.
 *
 * @example
 * ```tsx
 * <ClipRangeSelector
 *   durationMs={recording.duration_ms}
 *   startMs={clipStart}
 *   endMs={clipEnd}
 *   onChange={({ startMs, endMs }) => setClipRange(startMs, endMs)}
 * />
 * ```
 */
export function ClipRangeSelector({
  durationMs,
  startMs,
  endMs,
  onChange,
  minDurationMs = 1000,
  maxDurationMs,
  disabled = false,
  className,
}: ClipRangeSelectorProps) {
  // Calculate clip duration
  const clipDurationMs = endMs - startMs

  // Validation state
  const isValid = useMemo(() => {
    if (endMs <= startMs) return false
    if (clipDurationMs < minDurationMs) return false
    if (maxDurationMs && clipDurationMs > maxDurationMs) return false
    if (endMs > durationMs) return false
    return true
  }, [endMs, startMs, clipDurationMs, minDurationMs, maxDurationMs, durationMs])

  // Handle slider value change
  const handleValueChange = useCallback(
    (values: number[]) => {
      let [newStart, newEnd] = values

      // Ensure minimum duration
      if (newEnd - newStart < minDurationMs) {
        // If dragging start, push end
        if (newStart !== startMs) {
          newEnd = Math.min(newStart + minDurationMs, durationMs)
          newStart = newEnd - minDurationMs
        } else {
          // If dragging end, push start
          newStart = Math.max(0, newEnd - minDurationMs)
          newEnd = newStart + minDurationMs
        }
      }

      // Ensure maximum duration if set
      if (maxDurationMs && newEnd - newStart > maxDurationMs) {
        if (newStart !== startMs) {
          newEnd = newStart + maxDurationMs
        } else {
          newStart = newEnd - maxDurationMs
        }
      }

      // Clamp to valid range
      newStart = Math.max(0, Math.min(newStart, durationMs - minDurationMs))
      newEnd = Math.min(durationMs, Math.max(newEnd, minDurationMs))

      onChange({ startMs: newStart, endMs: newEnd })
    },
    [startMs, minDurationMs, maxDurationMs, durationMs, onChange]
  )

  // Format time display
  const formatTime = (ms: number) => {
    return formatDuration(ms)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Time labels */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex flex-col">
          <span className="text-muted-foreground">Start</span>
          <span className="font-mono font-medium">{formatTime(startMs)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-muted-foreground">Duration</span>
          <span
            className={cn(
              'font-mono font-medium',
              !isValid && 'text-destructive'
            )}
          >
            {formatTime(clipDurationMs)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-muted-foreground">End</span>
          <span className="font-mono font-medium">{formatTime(endMs)}</span>
        </div>
      </div>

      {/* Range slider */}
      <div className="relative">
        <Slider
          value={[startMs, endMs]}
          min={0}
          max={durationMs}
          step={100} // 100ms precision
          onValueChange={handleValueChange}
          disabled={disabled}
          className={cn(
            'w-full',
            '[&_[data-slot=slider-range]]:bg-primary/60',
            '[&_[data-slot=slider-thumb]]:border-primary',
            '[&_[data-slot=slider-thumb]]:bg-primary',
            '[&_[data-slot=slider-thumb]]:w-4',
            '[&_[data-slot=slider-thumb]]:h-4'
          )}
        />

        {/* Timeline tick marks */}
        <div className="absolute top-4 left-0 right-0 flex justify-between px-2 pointer-events-none">
          {[0, 25, 50, 75, 100].map((percent) => (
            <div key={percent} className="flex flex-col items-center">
              <div className="w-px h-1.5 bg-muted-foreground/30" />
              <span className="text-[12px] text-muted-foreground mt-0.5">
                {formatTime((durationMs * percent) / 100)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Validation message */}
      {!isValid && (
        <p className="text-xs text-destructive">
          {endMs <= startMs && 'End time must be after start time'}
          {clipDurationMs < minDurationMs &&
            `Minimum clip duration is ${formatTime(minDurationMs)}`}
          {maxDurationMs &&
            clipDurationMs > maxDurationMs &&
            `Maximum clip duration is ${formatTime(maxDurationMs)}`}
          {endMs > durationMs && 'Clip cannot exceed recording duration'}
        </p>
      )}
    </div>
  )
}
