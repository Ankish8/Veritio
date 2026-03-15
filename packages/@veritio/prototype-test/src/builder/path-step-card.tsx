'use client'

import { Image as ImageIcon, Pencil, Diamond } from 'lucide-react'
import { cn } from '@veritio/ui'
import { CompositeThumbnail, isOverlayFrame, type OverlayData } from './composite-thumbnail'
import type { PrototypeTestFrame } from '@veritio/study-types'

export interface PathStepCardProps {
  frame: PrototypeTestFrame
  index: number
  isStart?: boolean
  isGoal?: boolean
  isCurrent?: boolean
  onEdit?: () => void
  overlays?: OverlayData[]
  frameWidth?: number
  frameHeight?: number
  variantLabel?: string
  hasComponentChange?: boolean
  previousFrame?: PrototypeTestFrame | null
  previousFrameOverlays?: OverlayData[]
  previousFrameWidth?: number
  previousFrameHeight?: number
}

export function PathStepCard({
  frame,
  index,
  isStart,
  isGoal,
  isCurrent,
  onEdit,
  overlays,
  frameWidth,
  frameHeight,
  variantLabel,
  hasComponentChange,
  previousFrame,
  previousFrameOverlays,
  previousFrameWidth,
  previousFrameHeight,
}: PathStepCardProps) {
  const hasOverlays = overlays && overlays.length > 0 && frameWidth && frameHeight
  const hasPreviousFrameOverlays = previousFrameOverlays && previousFrameOverlays.length > 0 && previousFrameWidth && previousFrameHeight

  // Detect if this frame is an overlay that should be composited on the previous frame
  const isOverlayResult = !isStart && previousFrame && isOverlayFrame(frame, previousFrame)
  const isOverlay = isOverlayResult

  // Fallback: When a component state changed but we couldn't render overlays,
  // show a blue ring around the entire card so the user knows it was tracked.
  const hasUnhighlightedChange = !!(hasComponentChange && !isStart && !hasOverlays)

  // For overlays, use previous frame's dimensions for the container aspect ratio
  // This ensures the composite view has proper proportions
  const baseWidth = isOverlay && previousFrame?.width ? previousFrame.width : (frameWidth || frame.width || 16)
  const baseHeight = isOverlay && previousFrame?.height ? previousFrame.height : (frameHeight || frame.height || 10)
  const aspectRatio = baseWidth / baseHeight

  return (
    <div className="relative group">
      {/* Card container */}
      <div
        className={cn(
          'relative rounded-lg overflow-hidden transition-all bg-background border',
          isCurrent && 'ring-2 ring-primary',
          hasUnhighlightedChange && !isCurrent && 'ring-2 ring-blue-400/60'
        )}
      >
        {/* Thumbnail - use actual frame aspect ratio to prevent stretching */}
        <div className="bg-muted relative" style={{ aspectRatio }}>
          {/* Overlay frame compositing - show overlay centered on previous frame */}
          {isOverlay && previousFrame?.thumbnail_url && frame.thumbnail_url ? (
            <div className="relative w-full h-full">
              {/* Base frame (previous screen) - use CompositeThumbnail if it has component overlays */}
              {hasPreviousFrameOverlays && previousFrameWidth && previousFrameHeight ? (
                <CompositeThumbnail
                  baseImageUrl={previousFrame.thumbnail_url}
                  overlays={previousFrameOverlays!}
                  frameWidth={previousFrameWidth}
                  frameHeight={previousFrameHeight}
                  showOverlayLabel={false}
                  className="w-full h-full"
                />
              ) : (
                <img
                  src={previousFrame.thumbnail_url}
                  alt={previousFrame.name}
                  className="w-full h-full object-contain"
                />
              )}
              {/* Overlay frame centered with shadow and scrim */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Scrim/backdrop */}
                <div className="absolute inset-0 bg-black/30" />
                {/* Overlay frame centered */}
                <img
                  src={frame.thumbnail_url}
                  alt={frame.name}
                  className="relative z-10 max-w-[80%] max-h-[80%] object-contain shadow-2xl rounded-lg"
                  style={{
                    // Calculate overlay size relative to base frame
                    maxWidth: frame.width && previousFrame.width
                      ? `${Math.min(80, (frame.width / previousFrame.width) * 100)}%`
                      : '80%',
                    maxHeight: frame.height && previousFrame.height
                      ? `${Math.min(80, (frame.height / previousFrame.height) * 100)}%`
                      : '80%',
                  }}
                />
              </div>
            </div>
          ) : hasOverlays && frame.thumbnail_url ? (
            <CompositeThumbnail
              baseImageUrl={frame.thumbnail_url}
              overlays={overlays}
              frameWidth={frameWidth}
              frameHeight={frameHeight}
              showOverlayLabel={false}
              className="w-full h-full"
            />
          ) : frame.thumbnail_url ? (
            <img
              src={frame.thumbnail_url}
              alt={frame.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}

          {/* Step type badge - top left */}
          {(isStart || isGoal) && (
            <div className={cn(
              'absolute top-2 left-2 px-2 py-0.5 rounded text-[12px] font-medium uppercase tracking-wide',
              isStart && 'bg-foreground text-background',
              isGoal && !isStart && 'bg-primary text-primary-foreground'
            )}>
              {isStart ? 'Start' : 'Goal'}
            </div>
          )}

          {/* Variant / component state label moved to footer to avoid covering thumbnail */}
        </div>

        {/* Frame info footer */}
        <div className="px-3 py-2 border-t flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{frame.name}</p>
            {(variantLabel || hasComponentChange) && !isStart && (
              <div className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-muted-foreground truncate">
                {hasComponentChange && <Diamond className="h-3 w-3 text-violet-500" />}
                <span className="truncate">{variantLabel || 'Component state'}</span>
              </div>
            )}
          </div>

          {/* Edit button for Start/Goal - always visible */}
          {(isStart || isGoal) && onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="flex-shrink-0 w-7 h-7 rounded-md border bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function FlexiblePathIndicator() {
  return (
    <div className="flex items-center justify-center py-3 my-1">
      <div className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-lg bg-muted/50 border border-dashed border-border">
        <span className="text-xs font-medium text-muted-foreground">Any path allowed</span>
        <span className="text-[12px] text-muted-foreground/70">Participant can take any route</span>
      </div>
    </div>
  )
}

export function formatVariantLabel(variantInfo: { variantName: string; componentSetName: string } | null): string | undefined {
  if (!variantInfo) return undefined
  const variantValue = variantInfo.variantName.split('=').pop()?.trim() || variantInfo.variantName
  if (variantInfo.componentSetName) {
    return `${variantInfo.componentSetName} (${variantValue})`
  }
  return variantValue
}
