'use client'

/**
 * Enhanced Timeline Toolbar
 *
 * Extended toolbar with tool selection, zoom controls, and editing actions.
 * Includes NLE-style tool palette with keyboard shortcut hints.
 */

import { memo } from 'react'
import {
  MousePointer2,
  Scissors,
  Type,
  Square,
  Circle,
  Sparkles,
  Eye,
  Plus,
  Magnet,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  X,
  Split,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useToolStore } from '@/stores/tool-store'
import { useHistoryStore } from '@/stores/history-store'
import type { ToolType, AnnotationMode } from '@/lib/video-editor/tools/tool-types'

export interface EnhancedToolbarProps {
  zoomLevel: number
  onZoomChange: (level: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToView: () => void
  snapEnabled: boolean
  onToggleSnap: () => void
  hasSelection: boolean
  onCreateClip?: () => void
  onClearSelection?: () => void
  onSplitAtPlayhead?: () => void
  onDeleteSelected?: () => void
}

/** Tool definitions with icons and shortcuts */
const TOOLS: { type: ToolType; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
  { type: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { type: 'razor', icon: Scissors, label: 'Razor', shortcut: 'C' },
]

/** Annotation mode definitions */
const ANNOTATION_MODES: { mode: AnnotationMode; icon: typeof Type; label: string }[] = [
  { mode: 'text', icon: Type, label: 'Text' },
  { mode: 'rectangle', icon: Square, label: 'Rectangle' },
  { mode: 'circle', icon: Circle, label: 'Circle' },
  { mode: 'blur', icon: Eye, label: 'Blur' },
  { mode: 'highlight', icon: Sparkles, label: 'Highlight' },
]

export const EnhancedToolbar = memo(function EnhancedToolbar({
  zoomLevel,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onFitToView,
  snapEnabled,
  onToggleSnap,
  hasSelection,
  onCreateClip,
  onClearSelection,
  onSplitAtPlayhead,
  onDeleteSelected,
}: EnhancedToolbarProps) {
  const activeTool = useToolStore((s) => s.activeTool)
  const setActiveTool = useToolStore((s) => s.setActiveTool)
  const annotationState = useToolStore((s) => s.annotationState)
  const setAnnotationMode = useToolStore((s) => s.setAnnotationMode)

  const canUndo = useHistoryStore((s) => s.canUndo)
  const canRedo = useHistoryStore((s) => s.canRedo)
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)

  const handleZoomChange = (values: number[]) => {
    onZoomChange(values[0])
  }

  const handleAnnotationModeSelect = (mode: AnnotationMode) => {
    setAnnotationMode(mode)
    setActiveTool('annotation')
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/30">
        {/* Left section: Tools */}
        <div className="flex items-center gap-1">
          {/* Main tools */}
          {TOOLS.map(({ type, icon: Icon, label, shortcut }) => (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTool(type)}
                  className={cn(
                    'h-7 w-7 p-0',
                    activeTool === type
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="flex items-center gap-1.5">
                <span>{label}</span>
                <kbd className="px-1 py-0.5 text-[12px] bg-muted rounded">{shortcut}</kbd>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Annotation tools dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-7 px-1.5 gap-0.5',
                      activeTool === 'annotation'
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {(() => {
                      const mode = ANNOTATION_MODES.find(m => m.mode === annotationState.mode)
                      const Icon = mode?.icon || Type
                      return <Icon className="h-4 w-4" />
                    })()}
                    <span className="text-[12px] ml-0.5">▼</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>Annotation Tool</span>
                <kbd className="ml-1.5 px-1 py-0.5 text-[12px] bg-muted rounded">A</kbd>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              {ANNOTATION_MODES.map(({ mode, icon: Icon, label }) => (
                <DropdownMenuItem
                  key={mode}
                  onClick={() => handleAnnotationModeSelect(mode)}
                  className={cn(
                    'gap-2',
                    annotationState.mode === mode && activeTool === 'annotation' && 'bg-primary/10'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Snap toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSnap}
                className={cn(
                  'h-7 px-2 text-xs gap-1.5',
                  snapEnabled
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Magnet className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Snap</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>Toggle Snapping</span>
              <kbd className="ml-1.5 px-1 py-0.5 text-[12px] bg-muted rounded">N</kbd>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Undo/Redo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={!canUndo}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>Undo</span>
              <kbd className="ml-1.5 px-1 py-0.5 text-[12px] bg-muted rounded">⌘Z</kbd>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={!canRedo}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>Redo</span>
              <kbd className="ml-1.5 px-1 py-0.5 text-[12px] bg-muted rounded">⌘⇧Z</kbd>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Center section: Actions */}
        <div className="flex items-center gap-1">
          {/* Split at playhead */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSplitAtPlayhead}
                className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Split className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Split</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>Split at Playhead</span>
              <kbd className="ml-1.5 px-1 py-0.5 text-[12px] bg-muted rounded">S</kbd>
            </TooltipContent>
          </Tooltip>

          {/* Create clip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateClip}
                disabled={!hasSelection}
                className={cn(
                  'h-7 px-2 text-xs gap-1.5',
                  hasSelection && 'border-primary text-primary'
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Create Clip</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>Create Clip from Selection</span>
            </TooltipContent>
          </Tooltip>

          {/* Clear selection */}
          {hasSelection && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>Clear Selection</span>
                <kbd className="ml-1.5 px-1 py-0.5 text-[12px] bg-muted rounded">Esc</kbd>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Delete selected */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDeleteSelected}
                disabled={!hasSelection}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>Delete Selected</span>
              <kbd className="ml-1.5 px-1 py-0.5 text-[12px] bg-muted rounded">Del</kbd>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right section: Zoom controls */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomOut}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>

          <div className="w-20">
            <Slider
              value={[zoomLevel]}
              onValueChange={handleZoomChange}
              min={0.25}
              max={4}
              step={0.25}
              className="w-full"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomIn}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onFitToView}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>Fit to View</span>
              <kbd className="ml-1.5 px-1 py-0.5 text-[12px] bg-muted rounded">\</kbd>
            </TooltipContent>
          </Tooltip>

          <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>
      </div>
    </TooltipProvider>
  )
})
