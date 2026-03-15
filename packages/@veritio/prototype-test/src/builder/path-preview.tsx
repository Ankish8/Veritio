'use client'

import { ChevronRight, X, Image as ImageIcon } from 'lucide-react'
import { cn, Badge } from '@veritio/ui'
import type { PrototypeTestFrame } from '@veritio/study-types'

interface PathPreviewProps {
  frames: PrototypeTestFrame[]
  pathFrameIds: string[]
  maxVisible?: number
  onEdit?: () => void
  onRemoveFrame?: (frameId: string) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function PathPreview({
  frames,
  pathFrameIds,
  maxVisible = 4,
  onEdit,
  onRemoveFrame,
  className,
  size = 'sm',
}: PathPreviewProps) {
  const pathFrames = pathFrameIds
    .map((id) => frames.find((f) => f.id === id))
    .filter(Boolean) as PrototypeTestFrame[]

  if (pathFrames.length === 0) {
    return null
  }

  const visibleFrames = pathFrames.slice(0, maxVisible)
  const remainingCount = pathFrames.length - maxVisible

  // Size configurations - larger thumbnails with proper aspect ratio
  const sizeConfig = {
    sm: { thumbnail: 'w-12', aspect: 'aspect-[4/3]', icon: 'h-3 w-3', arrow: 'h-3 w-3' },
    md: { thumbnail: 'w-16', aspect: 'aspect-[4/3]', icon: 'h-4 w-4', arrow: 'h-4 w-4' },
    lg: { thumbnail: 'w-20', aspect: 'aspect-[4/3]', icon: 'h-5 w-5', arrow: 'h-4 w-4' },
  }
  const config = sizeConfig[size]

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        onEdit && 'cursor-pointer hover:opacity-80',
        className
      )}
      onClick={onEdit}
      role={onEdit ? 'button' : undefined}
      tabIndex={onEdit ? 0 : undefined}
    >
      {/* Thumbnails row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {visibleFrames.map((frame, index) => (
          <div key={`${frame.id}-${index}`} className="flex items-center gap-1.5">
            {/* Frame thumbnail */}
            <div className="relative group">
              <div
                className={cn(
                  config.thumbnail,
                  config.aspect,
                  'rounded border bg-muted overflow-hidden'
                )}
                title={frame.name}
              >
                {frame.thumbnail_url ? (
                  <img
                    src={frame.thumbnail_url}
                    alt={frame.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className={cn(config.icon, 'text-muted-foreground')} />
                  </div>
                )}
              </div>

              {/* Remove button on hover */}
              {onRemoveFrame && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveFrame(frame.id)
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove from path"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>

            {/* Arrow between frames */}
            {index < visibleFrames.length - 1 && (
              <ChevronRight className={cn(config.arrow, 'text-muted-foreground flex-shrink-0')} />
            )}
          </div>
        ))}
      </div>

      {/* Remaining count badge - shown below like Maze */}
      {remainingCount > 0 && (
        <span className="text-xs text-muted-foreground">
          +{remainingCount} more
        </span>
      )}
    </div>
  )
}

// Compact inline version for use in task cards
export function PathPreviewInline({
  frames,
  pathFrameIds,
  onClick,
}: {
  frames: PrototypeTestFrame[]
  pathFrameIds: string[]
  onClick?: () => void
}) {
  const pathFrames = pathFrameIds
    .map((id) => frames.find((f) => f.id === id))
    .filter(Boolean) as PrototypeTestFrame[]

  if (pathFrames.length === 0) {
    return null
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 p-2 bg-muted/50 rounded-md hover:bg-muted transition-colors"
    >
      <span className="text-xs text-muted-foreground">Path:</span>
      {pathFrames.slice(0, 3).map((frame, index) => (
        <div key={`${frame.id}-${index}`} className="flex items-center gap-1">
          <div className="w-8 aspect-[4/3] rounded border bg-muted overflow-hidden">
            {frame.thumbnail_url ? (
              <img
                src={frame.thumbnail_url}
                alt={frame.name}
                className="w-full h-full object-contain"
                title={frame.name}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
            )}
          </div>
          {index < Math.min(pathFrames.length, 3) - 1 && (
            <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
          )}
        </div>
      ))}
      {pathFrames.length > 3 && (
        <Badge variant="secondary" className="text-xs ml-1">
          +{pathFrames.length - 3}
        </Badge>
      )}
    </button>
  )
}
