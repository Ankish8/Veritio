'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Star,
  Pencil,
  Trash2,
  Plus,
  ChevronRight,
  Image as ImageIcon,
  Check,
  X,
  Route,
  Lightbulb,
  GripVertical,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Input, ConfirmDialog, cn } from '@veritio/ui'
import {
  CompositeThumbnail,
  computePathOverlays,
  type ComponentVariantData,
  type ComponentInstanceData,
  type OverlayData,
} from './composite-thumbnail'
import type { SuccessPath, PrototypeTestFrame, PathwayStep } from '@veritio/study-types'
import { stepsToPositionFrames } from '../lib/utils/pathway-migration'
type PathWithSteps = SuccessPath & { steps?: PathwayStep[] }

interface PathListProps {
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
  compact?: boolean
  className?: string
}
interface SortablePathItemProps {
  path: SuccessPath
  children: (props: { dragHandleProps: Record<string, unknown>; isDragging: boolean }) => React.ReactNode
}

function SortablePathItem({ path, children }: SortablePathItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: path.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners }, isDragging })}
    </div>
  )
}
export function PathList({
  paths,
  frames,
  componentVariants = [],
  componentInstances = [],
  onAddPath,
  onEditPath,
  onRemovePath,
  onSetPrimary,
  onRenamePath,
  onReorderPaths,
  compact = false,
  className,
}: PathListProps) {
  const [editingPathId, setEditingPathId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    pathId: string
    pathName: string
  } | null>(null)

  // Drag-and-drop sensors
  const pointerSensorOptions = useMemo(() => ({
    activationConstraint: { distance: 8 },
  }), [])

  const sensors = useSensors(
    useSensor(PointerSensor, pointerSensorOptions),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id && onReorderPaths) {
      const oldIndex = paths.findIndex((p) => p.id === active.id)
      const newIndex = paths.findIndex((p) => p.id === over.id)
      onReorderPaths(arrayMove(paths, oldIndex, newIndex))
    }
  }, [paths, onReorderPaths])

  // Start inline editing of path name
  const handleStartRename = useCallback((path: SuccessPath) => {
    setEditingPathId(path.id)
    setEditingName(path.name)
  }, [])

  // Save the edited name
  const handleSaveRename = useCallback(() => {
    if (editingPathId && editingName.trim()) {
      onRenamePath(editingPathId, editingName.trim())
    }
    setEditingPathId(null)
    setEditingName('')
  }, [editingPathId, editingName, onRenamePath])

  // Cancel editing
  const handleCancelRename = useCallback(() => {
    setEditingPathId(null)
    setEditingName('')
  }, [])

  // Handle enter/escape in rename input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveRename()
      } else if (e.key === 'Escape') {
        handleCancelRename()
      }
    },
    [handleSaveRename, handleCancelRename]
  )

  // Get frame data for a frame ID
  const getFrame = useCallback(
    (frameId: string) => frames.find((f) => f.id === frameId),
    [frames]
  )

  if (paths.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 px-4 text-center', className)}>
        {/* Illustrated icon */}
        <div className="relative mb-6">
          {/* Background decorative elements */}
          <div className="absolute -top-2 -left-3 w-14 h-14 rounded-full bg-primary/5" />
          <div className="absolute -bottom-1 -right-2 w-10 h-10 rounded-full bg-muted" />

          {/* Main icon container */}
          <div className="relative w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Route className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold mb-2">
          No success routes defined
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground max-w-xs mb-5">
          Define the correct pathways participants can take to complete this task.
          You can add multiple routes if there are different valid approaches.
        </p>

        {/* Pro tip box */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6 max-w-sm">
          <div className="flex items-start gap-2.5">
            <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-0.5">Pro tip</p>
              <p className="text-xs text-amber-700 dark:text-amber-400/80">
                Mark one path as "Expected" to compare participant efficiency.
                Alternative routes are counted as successful but tracked separately in analysis.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Button onClick={onAddPath} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Add your first route
        </Button>
      </div>
    )
  }

  const renderPathCard = (
    path: PathWithSteps,
    dragHandleProps?: Record<string, unknown>,
    isDragging?: boolean
  ) => {
    const isEditing = editingPathId === path.id
    const positionFrameIds = path.steps ? stepsToPositionFrames(path.steps) : path.frames
    const pathFrames = positionFrameIds
      .map((id) => getFrame(id))
      .filter(Boolean) as PrototypeTestFrame[]
    const maxThumbnails = compact ? 3 : 4
    const visibleFrames = pathFrames.slice(0, maxThumbnails)
    const remainingCount = pathFrames.length - maxThumbnails

    // Compute overlays for frames that have component state steps (V3 paths)
    const pathOverlays = path.steps?.length && componentVariants.length && componentInstances.length
      ? computePathOverlays(path.steps, frames, componentVariants, componentInstances)
      : new Map<number, OverlayData[]>()

    return (
      <div
        className={cn(
          'relative group rounded-lg border bg-card overflow-hidden transition-all',
          path.is_primary
            ? 'border-primary/50 bg-primary/5'
            : 'border-border hover:border-muted-foreground/50',
          isDragging && 'opacity-50 ring-2 ring-primary'
        )}
      >
        {/* Header row */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
          {/* Drag handle - only show if reordering is enabled */}
          {onReorderPaths && dragHandleProps && (
            <button
              type="button"
              className="touch-none cursor-grab p-1 -ml-1 text-muted-foreground hover:text-foreground rounded transition-colors"
              aria-label="Drag to reorder"
              {...dragHandleProps}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}

          {/* Expected/Alt indicator - clickable to toggle */}
          <button
            type="button"
            onClick={() => onSetPrimary(path.id)}
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors',
              path.is_primary
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            title={path.is_primary ? 'Expected path (used as baseline for efficiency comparison)' : 'Click to set as expected path'}
            aria-label={path.is_primary ? 'Expected path' : 'Set as expected path'}
          >
            <Star
              className={cn(
                'h-3 w-3',
                path.is_primary && 'fill-primary'
              )}
            />
            {path.is_primary ? 'Expected' : 'Alt'}
          </button>

          {/* Path name - editable */}
          {isEditing ? (
            <div className="flex-1 flex items-center gap-1">
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveRename}
                className="h-6 text-sm py-0"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveRename}
                className="p-1 text-primary hover:bg-primary/10 rounded"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleCancelRename}
                className="p-1 text-muted-foreground hover:bg-muted rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleStartRename(path)}
              className="flex-1 text-left text-sm font-medium truncate hover:text-primary transition-colors"
              title="Click to rename"
            >
              {path.name}
            </button>
          )}

          {/* Actions - always visible for accessibility */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onEditPath(path.id)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              title="Edit path"
              aria-label={`Edit path: ${path.name}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirm({ open: true, pathId: path.id, pathName: path.name })}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              title="Delete path"
              aria-label={`Delete path: ${path.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Thumbnail row - larger thumbnails for better visibility */}
        <div className="flex items-center gap-2 p-3 overflow-x-auto">
          {visibleFrames.map((frame, index) => {
            const overlays = pathOverlays.get(index) || []
            const hasOverlays = overlays.length > 0 && frame.thumbnail_url

            return (
              <div key={`${frame.id}-${index}`} className="flex items-center gap-1.5 flex-shrink-0">
                {/* Frame thumbnail - 80px width (up from 48px) */}
                <div
                  className={cn(
                    'rounded-md border bg-muted overflow-hidden shadow-sm',
                    compact ? 'w-14 aspect-[4/3]' : 'w-20 aspect-[4/3]'
                  )}
                  title={frame.name}
                >
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
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Arrow between frames */}
                {index < visibleFrames.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            )
          })}

          {/* Remaining count */}
          {remainingCount > 0 && (
            <span className="text-xs text-muted-foreground ml-1 flex-shrink-0">
              +{remainingCount} more
            </span>
          )}

          {/* Frame count for paths with no thumbnails */}
          {visibleFrames.length === 0 && (
            <span className="text-xs text-muted-foreground">
              {positionFrameIds.length} screens
            </span>
          )}
        </div>

        {/* Screen count indicator */}
        <div className="px-3 pb-2 text-xs text-muted-foreground">
          {pathFrames.length} {pathFrames.length === 1 ? 'screen' : 'screens'}
        </div>
      </div>
    )
  }

  // Render with or without drag-and-drop
  const pathItems = onReorderPaths ? (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={paths.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        {paths.map((path) => (
          <SortablePathItem key={path.id} path={path}>
            {({ dragHandleProps, isDragging }) => renderPathCard(path, dragHandleProps, isDragging)}
          </SortablePathItem>
        ))}
      </SortableContext>
    </DndContext>
  ) : (
    paths.map((path) => (
      <div key={path.id}>{renderPathCard(path)}</div>
    ))
  )

  return (
    <div className={cn('space-y-2', className)}>
      {pathItems}

      {/* Add another route button */}
      <Button
        variant="outline"
        onClick={onAddPath}
        className={cn(
          'w-full',
          compact && 'h-8 text-xs'
        )}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add another route
      </Button>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteConfirm?.open ?? false}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete this route?"
        description={`"${deleteConfirm?.pathName}" will be permanently removed. This action cannot be undone.`}
        confirmText="Delete route"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirm) {
            onRemovePath(deleteConfirm.pathId)
            setDeleteConfirm(null)
          }
        }}
      />
    </div>
  )
}
export function PathListCompact({
  paths,
  onClick,
  className,
}: {
  paths: SuccessPath[]
  onClick?: () => void
  className?: string
}) {
  if (paths.length === 0) return null

  const expectedPath = paths.find((p) => p.is_primary) || paths[0]
  const alternativeCount = paths.length - 1

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 text-left w-full p-2.5 rounded-md',
        'bg-muted/30 hover:bg-muted/50 transition-colors',
        className
      )}
      aria-label={`Expected path: ${expectedPath.name}${alternativeCount > 0 ? `, plus ${alternativeCount} alternative route${alternativeCount > 1 ? 's' : ''}` : ''}`}
    >
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[12px] font-medium bg-primary/10 text-primary flex-shrink-0">
        <Star className="h-2.5 w-2.5 fill-primary" />
        Expected
      </span>
      <span className="text-sm font-medium truncate">{expectedPath.name}</span>
      {alternativeCount > 0 && (
        <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
          +{alternativeCount} {alternativeCount === 1 ? 'alt' : 'alts'}
        </span>
      )}
    </button>
  )
}
