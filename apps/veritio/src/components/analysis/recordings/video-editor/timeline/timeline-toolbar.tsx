'use client'

import { Plus, Magnet, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { useVideoEditorStore } from '@/stores/video-editor-store'

export interface TimelineToolbarProps {
  onCreateClip: () => void
  hasClipSelection: boolean
  onClearSelection?: () => void
}

/**
 * Toolbar for timeline controls:
 * - Add clip button
 * - Snap toggle
 * - Zoom slider
 * - Fit to view button
 */
export function TimelineToolbar({
  onCreateClip,
  hasClipSelection,
  onClearSelection,
}: TimelineToolbarProps) {
  const zoomLevel = useVideoEditorStore((s) => s.zoomLevel)
  const setZoomLevel = useVideoEditorStore((s) => s.setZoomLevel)
  const snapEnabled = useVideoEditorStore((s) => s.snapEnabled)
  const toggleSnap = useVideoEditorStore((s) => s.toggleSnap)
  const zoomIn = useVideoEditorStore((s) => s.zoomIn)
  const zoomOut = useVideoEditorStore((s) => s.zoomOut)
  const fitToView = useVideoEditorStore((s) => s.fitToView)

  const handleZoomChange = (values: number[]) => {
    setZoomLevel(values[0])
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
      {/* Left: Add clip */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateClip}
          disabled={!hasClipSelection}
          className={cn(
            'h-7 px-2 text-xs gap-1.5',
            hasClipSelection && 'border-primary text-primary'
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Create Clip
        </Button>

        {/* Clear selection button - only shown when there's a selection */}
        {hasClipSelection && onClearSelection && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            title="Clear selection (Escape)"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}

        <div className="h-4 w-px bg-border" />

        {/* Snap toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSnap}
          className={cn(
            'h-7 px-2 text-xs gap-1.5',
            snapEnabled
              ? 'text-primary bg-primary/10 hover:bg-primary/20'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Magnet className="h-3.5 w-3.5" />
          Snap
        </Button>
      </div>

      {/* Right: Zoom controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomOut}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>

        <div className="w-24">
          <Slider
            value={[zoomLevel]}
            onValueChange={handleZoomChange}
            min={0.5}
            max={4}
            step={0.25}
            className="w-full"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={zoomIn}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>

        <div className="h-4 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={fitToView}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Maximize2 className="h-3.5 w-3.5 mr-1" />
          Fit
        </Button>

        <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
          {Math.round(zoomLevel * 100)}%
        </span>
      </div>
    </div>
  )
}
