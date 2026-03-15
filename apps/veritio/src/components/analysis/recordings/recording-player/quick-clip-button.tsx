'use client'

/**
 * QuickClipButton Component
 *
 * A button that creates a quick 30-second clip from the current playback position.
 * Designed to be placed in the player controls bar.
 */

import { useCallback, useState } from 'react'
import { useMediaState } from '@vidstack/react'
import { Scissors, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/** Default clip duration in milliseconds (30 seconds) */
const DEFAULT_CLIP_DURATION_MS = 30000

export interface QuickClipButtonProps {
  /** Recording duration in ms */
  durationMs: number
  /** Callback when quick clip is requested */
  onQuickClip: (startMs: number, endMs: number) => Promise<void>
  /** Custom clip duration in ms (default: 30s) */
  clipDurationMs?: number
  /** Optional className */
  className?: string
}

/**
 * Quick clip button for the player controls bar.
 *
 * Creates a clip starting from current position, spanning clipDurationMs.
 * Shows a brief success animation when clip is created.
 *
 * @example
 * ```tsx
 * <QuickClipButton
 *   durationMs={recording.duration_ms}
 *   onQuickClip={async (start, end) => {
 *     await createClip({ startMs: start, endMs: end, title: 'Quick Clip' })
 *   }}
 * />
 * ```
 */
export function QuickClipButton({
  durationMs,
  onQuickClip,
  clipDurationMs = DEFAULT_CLIP_DURATION_MS,
  className,
}: QuickClipButtonProps) {
  const currentTime = useMediaState('currentTime')
  const [isCreating, setIsCreating] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const currentTimeMs = currentTime * 1000

  // Calculate clip range
  const clipStartMs = Math.max(0, currentTimeMs)
  const clipEndMs = Math.min(clipStartMs + clipDurationMs, durationMs)
  const actualDurationMs = clipEndMs - clipStartMs

  // Format duration for tooltip
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    return seconds >= 60
      ? `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
      : `${seconds}s`
  }

  const handleClick = useCallback(async () => {
    if (isCreating || showSuccess) return

    setIsCreating(true)
    try {
      await onQuickClip(clipStartMs, clipEndMs)
      setShowSuccess(true)
      // Reset success indicator after 2 seconds
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (_error) {
      // Error handling is done by the parent
    } finally {
      setIsCreating(false)
    }
  }, [isCreating, showSuccess, clipStartMs, clipEndMs, onQuickClip])

  // Determine button state
  const isDisabled = isCreating || actualDurationMs < 1000

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={isDisabled}
            className={cn(
              'h-8 w-8 text-white hover:bg-white/20',
              showSuccess && 'text-green-400',
              className
            )}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : showSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Scissors className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {showSuccess ? (
            'Clip created!'
          ) : isCreating ? (
            'Creating clip...'
          ) : (
            <>
              Quick clip ({formatDuration(actualDurationMs)})
              <span className="text-muted-foreground ml-1">from current position</span>
            </>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
