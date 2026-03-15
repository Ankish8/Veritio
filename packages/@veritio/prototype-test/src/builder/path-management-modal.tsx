'use client'

import { useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  KeyboardShortcutHint,
  EscapeHint,
  useKeyboardShortcut,
  cn,
} from '@veritio/ui'
import { PathList } from './path-list'
import {
  CompositeThumbnail,
  computePathOverlays,
  type ComponentVariantData,
  type ComponentInstanceData,
} from './composite-thumbnail'
import type { SuccessPath, PrototypeTestFrame, PathwayStep } from '@veritio/study-types'
import { stepsToPositionFrames } from '../lib/utils/pathway-migration'
type PathWithSteps = SuccessPath & { steps?: PathwayStep[] }

interface PathManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paths: PathWithSteps[]
  frames: PrototypeTestFrame[]
  componentVariants?: ComponentVariantData[]
  componentInstances?: ComponentInstanceData[]
  onAddPath: () => void
  onEditPath: (pathId: string) => void
  onRemovePath: (pathId: string) => void
  onSetPrimary: (pathId: string) => void
  onRenamePath: (pathId: string, name: string) => void
  onReorderPaths?: (paths: PathWithSteps[]) => void
}
export function PathManagementModal({
  open,
  onOpenChange,
  paths,
  frames,
  componentVariants,
  componentInstances,
  onAddPath,
  onEditPath,
  onRemovePath,
  onSetPrimary,
  onRenamePath,
  onReorderPaths,
}: PathManagementModalProps) {
  const handleDone = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  // Keyboard shortcuts: Cmd+Enter to close/done
  useKeyboardShortcut({
    enabled: open,
    onCmdEnter: handleDone,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Success Routes</DialogTitle>
          <DialogDescription>
            Define the correct pathways participants can take to complete this task.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <PathList
            paths={paths}
            frames={frames}
            componentVariants={componentVariants}
            componentInstances={componentInstances}
            onAddPath={onAddPath}
            onEditPath={onEditPath}
            onRemovePath={onRemovePath}
            onSetPrimary={onSetPrimary}
            onRenamePath={onRenamePath}
            onReorderPaths={onReorderPaths}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
            <EscapeHint />
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Done
            <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
interface PathSummaryProps {
  paths: PathWithSteps[]
  frames: PrototypeTestFrame[]
  componentVariants?: ComponentVariantData[]
  componentInstances?: ComponentInstanceData[]
  className?: string
}

export function PathSummary({
  paths,
  frames,
  componentVariants = [],
  componentInstances = [],
  className,
}: PathSummaryProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (paths.length === 0) return null

  const primaryPath = paths.find((p) => p.is_primary) || paths[0]
  const totalPaths = paths.length

  // Get all frames in the path order
  const positionFrameIds = primaryPath.steps ? stepsToPositionFrames(primaryPath.steps) : primaryPath.frames
  const pathFrames = positionFrameIds
    .map((frameId) => frames.find((f) => f.id === frameId))
    .filter((f): f is PrototypeTestFrame => f !== undefined)

  // Compute overlays for frames that have component state steps (V3 paths)
  const pathOverlays = primaryPath.steps?.length && componentVariants.length && componentInstances.length
    ? computePathOverlays(primaryPath.steps, frames, componentVariants, componentInstances)
    : new Map<number, never[]>()

  const scroll = (direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!scrollRef.current) return
    const scrollAmount = scrollRef.current.clientWidth * 0.6
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  const showNavigation = pathFrames.length > 2

  return (
    <div
      className={cn(
        'w-full text-left',
        className
      )}
    >
      {/* Carousel container */}
      <div className="relative">
        {/* Scrollable frames container */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {pathFrames.map((frame, index) => {
            const overlays = pathOverlays.get(index) || []
            const hasOverlays = overlays.length > 0 && frame.thumbnail_url

            return (
            <div
              key={frame.id}
              className="flex-shrink-0 relative group/frame"
              style={{ width: 'calc(52% - 4px)' }}
            >
              {/* Thumbnail with clear border */}
              <div className="aspect-[4/3] rounded-md border border-border bg-background shadow-sm overflow-hidden">
                {hasOverlays ? (
                  <CompositeThumbnail
                    baseImageUrl={frame.thumbnail_url!}
                    overlays={overlays}
                    frameWidth={frame.width || 1440}
                    frameHeight={frame.height || 900}
                    className="w-full h-full"
                  />
                ) : frame.thumbnail_url ? (
                  <img
                    src={frame.thumbnail_url}
                    alt={frame.name}
                    className="w-full h-full object-contain bg-muted/30"
                    style={{ imageRendering: 'auto' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/30">
                    <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* Hover overlay with frame name */}
              <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover/frame:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/75 backdrop-blur-sm px-2 py-1.5 rounded-b-md">
                  <p className="text-[12px] text-white truncate font-medium">
                    {index === 0 ? frame.name : `→ ${frame.name}`}
                  </p>
                </div>
              </div>
            </div>
            )
          })}
        </div>

        {/* Navigation arrows - always visible when scrollable */}
        {showNavigation && (
          <>
            {/* Left arrow */}
            <div
              role="button"
              tabIndex={-1}
              onClick={(e) => scroll('left', e)}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10"
            >
              <div className="w-6 h-6 rounded-full bg-background border border-border shadow-md flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                <ChevronLeft className="h-3.5 w-3.5 text-foreground" />
              </div>
            </div>

            {/* Right arrow */}
            <div
              role="button"
              tabIndex={-1}
              onClick={(e) => scroll('right', e)}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10"
            >
              <div className="w-6 h-6 rounded-full bg-background border border-border shadow-md flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                <ChevronRight className="h-3.5 w-3.5 text-foreground" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Path info row - only show if multiple paths */}
      {totalPaths > 1 && (
        <div className="mt-1 flex items-center justify-end">
          <span className="text-[12px] text-muted-foreground/50">
            +{totalPaths - 1} more
          </span>
        </div>
      )}
    </div>
  )
}
