'use client'

/**
 * Track Item Component
 *
 * Renders an individual item on a track (clip, annotation, marker).
 * Supports selection, hover states, and displays item-specific content.
 */

import { memo, useCallback, useMemo } from 'react'
import { MessageSquare, CheckSquare, Type, Square, Sparkles, Eye, Monitor, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrackType, TrackItem as TrackItemType, ClipItem, AnnotationItem, MarkerItem, MediaItem } from '@/lib/video-editor/tracks/track-types'
import type { ToolType } from '@/lib/video-editor/tools/tool-types'

export interface TrackItemProps {
  item: TrackItemType
  trackType: TrackType
  pixelsPerMs: number
  height: number
  isSelected: boolean
  isLocked: boolean
  activeTool?: ToolType
  onSelect: (addToSelection: boolean) => void
  onTrimStart?: (itemId: string, edge: 'start' | 'end', initialX: number) => void
  onDragStart?: (itemId: string, initialX: number) => void
  onRazorClick?: (itemId: string, timeMs: number) => void
}

/** Tag colors for clips */
const TAG_COLORS: Record<string, string> = {
  highlight: 'bg-amber-500',
  issue: 'bg-red-500',
  insight: 'bg-blue-500',
  quote: 'bg-emerald-500',
  task: 'bg-violet-500',
  default: 'bg-slate-500',
}

/** Get color for a tag */
function getTagColor(tag: string): string {
  const normalized = tag.toLowerCase()
  return TAG_COLORS[normalized] || TAG_COLORS.default
}

/** Annotation type icons */
const ANNOTATION_ICONS = {
  text: Type,
  shape: Square,
  blur: Eye,
  highlight: Sparkles,
}

export const TrackItem = memo(function TrackItem({
  item,
  trackType,
  pixelsPerMs,
  height,
  isSelected,
  isLocked,
  activeTool = 'select',
  onSelect,
  onTrimStart,
  onDragStart,
  onRazorClick,
}: TrackItemProps) {
  // Calculate position and width
  const left = item.startMs * pixelsPerMs
  const width = (item.endMs - item.startMs) * pixelsPerMs

  // Handle click
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isLocked) return

      // Handle razor tool click - split at click position
      if (activeTool === 'razor' && onRazorClick) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const x = e.clientX - rect.left
        const clickTimeMs = item.startMs + x / pixelsPerMs
        onRazorClick(item.id, clickTimeMs)
        return
      }

      // Normal selection
      onSelect(e.shiftKey || e.metaKey || e.ctrlKey)
    },
     
    [isLocked, onSelect, activeTool, onRazorClick, item.startMs, pixelsPerMs, item.id]
  )

  // Handle trim start (left/right edge drag)
  const handleTrimMouseDown = useCallback(
    (e: React.MouseEvent, edge: 'start' | 'end') => {
      e.stopPropagation()
      e.preventDefault()
      if (isLocked || !onTrimStart) return
      onTrimStart(item.id, edge, e.clientX)
    },
    [isLocked, onTrimStart, item.id]
  )

  // Handle drag start (middle area drag)
  const handleDragMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only trigger on left mouse button and not on trim handles
      if (e.button !== 0 || isLocked || !onDragStart) return
      const target = e.target as HTMLElement
      if (target.dataset.edge) return // Clicked on trim handle
      onDragStart(item.id, e.clientX)
    },
    [isLocked, onDragStart, item.id]
  )

  // Render content based on track type
  const content = useMemo(() => {
    if (trackType === 'screen' || trackType === 'webcam') {
      const mediaItem = item as MediaItem
      return <MediaContent item={mediaItem} width={width} />
    }

    if (trackType === 'clips') {
      const clipItem = item as ClipItem
      return <ClipContent item={clipItem} width={width} />
    }

    if (trackType === 'annotations') {
      const annotationItem = item as AnnotationItem
      return <AnnotationContent item={annotationItem} />
    }

    if (trackType === 'markers') {
      const markerItem = item as MarkerItem
      return <MarkerContent item={markerItem} />
    }

    return null
  }, [trackType, item, width])

  // Determine cursor based on tool
  const cursorClass = useMemo(() => {
    if (isLocked) return 'opacity-50'
    if (activeTool === 'razor') return 'cursor-crosshair'
    if (onDragStart) return 'cursor-grab active:cursor-grabbing'
    return ''
  }, [isLocked, activeTool, onDragStart])

  return (
    <div
      className={cn(
        'absolute top-0.5 rounded-sm transition-all overflow-hidden',
        'hover:ring-2 hover:ring-primary/50',
        isSelected && 'ring-2 ring-primary shadow-md',
        cursorClass
      )}
      style={{
        left,
        width: Math.max(width, 4),
        height,
      }}
      onClick={handleClick}
      onMouseDown={handleDragMouseDown}
    >
      {content}

      {/* Trim handles - only show when selected and not a marker */}
      {isSelected && trackType !== 'markers' && !isLocked && (
        <>
          {/* Left trim handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/80 cursor-ew-resize hover:bg-primary z-10"
            data-edge="start"
            onMouseDown={(e) => handleTrimMouseDown(e, 'start')}
          />
          {/* Right trim handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1.5 bg-primary/80 cursor-ew-resize hover:bg-primary z-10"
            data-edge="end"
            onMouseDown={(e) => handleTrimMouseDown(e, 'end')}
          />
        </>
      )}
    </div>
  )
})

/** Clip item content */
function ClipContent({ item, width }: { item: ClipItem; width: number }) {
  const primaryTag = item.tags[0]
  const bgColor = primaryTag ? getTagColor(primaryTag) : 'bg-blue-500'

  return (
    <div
      className={cn(
        'h-full flex items-center gap-1.5 px-2',
        bgColor,
        'text-white'
      )}
    >
      {/* Thumbnail if available and width allows */}
      {item.thumbnailUrl && width > 60 && (
        <div className="flex-shrink-0 w-8 h-8 rounded overflow-hidden bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title */}
      {width > 30 && (
        <span className="text-xs font-medium truncate">
          {item.title}
        </span>
      )}
    </div>
  )
}

/** Annotation item content */
function AnnotationContent({ item }: { item: AnnotationItem }) {
  const Icon = ANNOTATION_ICONS[item.annotationType] || Type
  const bgColor = item.style.backgroundColor || item.style.color || '#f59e0b'

  return (
    <div
      className="h-full flex items-center gap-1 px-1.5"
      style={{
        backgroundColor: bgColor + '40',
        borderLeft: `3px solid ${bgColor}`,
      }}
    >
      <Icon className="h-3 w-3 flex-shrink-0" style={{ color: bgColor }} />
      {item.annotationType === 'text' && item.content && (
        <span className="text-xs truncate opacity-80">
          {item.content}
        </span>
      )}
    </div>
  )
}

/** Marker item content (comment or task) */
function MarkerContent({ item }: { item: MarkerItem }) {
  const Icon = item.markerType === 'comment' ? MessageSquare : CheckSquare
  const color = item.color || (item.markerType === 'comment' ? '#8b5cf6' : '#10b981')

  return (
    <div
      className="h-full flex items-center gap-1 px-1"
      style={{
        backgroundColor: color + '30',
        borderLeft: `2px solid ${color}`,
      }}
    >
      <Icon className="h-3 w-3 flex-shrink-0" style={{ color }} />
      <span className="text-xs truncate opacity-80">
        {item.label}
      </span>
    </div>
  )
}

/** Media source item content (screen recording, webcam) */
function MediaContent({ item, width }: { item: MediaItem; width: number }) {
  const Icon = item.mediaType === 'screen' ? Monitor : Video
  const color = item.color || (item.mediaType === 'screen' ? '#3b82f6' : '#10b981')

  return (
    <div
      className="h-full flex items-center gap-2 px-3"
      style={{
        background: `linear-gradient(90deg, ${color}90 0%, ${color}60 50%, ${color}90 100%)`,
      }}
    >
      <Icon className="h-4 w-4 flex-shrink-0 text-white/90" />
      {width > 100 && (
        <span className="text-xs font-medium text-white/90 truncate">
          {item.label}
        </span>
      )}
      {/* Waveform-like visual decoration */}
      <div className="flex-1 flex items-center gap-px opacity-30 overflow-hidden">
        {Array.from({ length: Math.min(Math.floor(width / 6), 100) }).map((_, i) => (
          <div
            key={i}
            className="w-1 bg-white rounded-full"
            style={{
              // eslint-disable-next-line react-hooks/purity
              height: `${20 + Math.sin(i * 0.5) * 15 + Math.random() * 10}%`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
