'use client'

/**
 * Track Row Component
 *
 * Renders a single track row in the timeline.
 * Contains the track header on the left and the track content area on the right.
 */

import { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { TrackHeader } from './track-header'
import { TrackItem } from './track-item'
import { WaveformTrack } from './waveform-track'
import { cn } from '@/lib/utils'
import { VIZ_COLORS } from '@/lib/colors'
import type { TrackState } from '@/stores/timeline-store'
import type { ToolType } from '@/lib/video-editor/tools/tool-types'

export interface TrackRowProps {
  track: TrackState
  pixelsPerMs: number
  duration: number
  currentTime: number
  isSelected: boolean
  selectedItemIds: Set<string>
  activeTool?: ToolType
  /** Optional audio URL for waveform display on screen/webcam tracks */
  audioUrl?: string | null
  onSelectTrack: () => void
  onToggleVisibility: () => void
  onToggleAudio: () => void
  onToggleLock: () => void
  onSelectItem: (itemId: string, addToSelection: boolean) => void
  onSeek: (timeMs: number) => void
  onTrimStart?: (itemId: string, edge: 'start' | 'end', initialX: number) => void
  onDragStart?: (itemId: string, initialX: number) => void
  onRazorClick?: (itemId: string, timeMs: number) => void
}

/** Header width in pixels */
const HEADER_WIDTH = 80

export const TrackRow = memo(function TrackRow({
  track,
  pixelsPerMs,
  duration,
  currentTime,
  isSelected,
  selectedItemIds,
  activeTool = 'select',
  audioUrl,
  onSelectTrack,
  onToggleVisibility,
  onToggleAudio,
  onToggleLock,
  onSelectItem,
  onSeek,
  onTrimStart,
  onDragStart,
  onRazorClick,
}: TrackRowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  const { properties, items } = track
  const { height, visible, locked, showWaveform } = properties

  // Track container width for waveform
  useEffect(() => {
    if (!containerRef.current) return

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()

    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [])

  // Sort items by start time
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.startMs - b.startMs)
  }, [items])

  // Check if waveform should be shown
  const shouldShowWaveform = showWaveform && audioUrl && (track.type === 'screen' || track.type === 'webcam')

  // Handle click on track content area
  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      // Only handle clicks on empty space, not on items
      if (e.target === e.currentTarget) {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const timeMs = x / pixelsPerMs
        onSeek(Math.max(0, Math.min(timeMs, duration)))
      }
    },
    [pixelsPerMs, duration, onSeek]
  )

  return (
    <div
      className={cn(
        'flex border-b relative',
        !visible && 'opacity-40',
        locked && 'pointer-events-none'
      )}
      style={{ height }}
    >
      {/* Track header */}
      <div className="flex-shrink-0" style={{ width: HEADER_WIDTH }}>
        <TrackHeader
          id={track.id}
          type={track.type}
          name={track.name}
          properties={track.properties}
          isSelected={isSelected}
          onSelect={onSelectTrack}
          onToggleVisibility={onToggleVisibility}
          onToggleAudio={onToggleAudio}
          onToggleLock={onToggleLock}
        />
      </div>

      {/* Track content area */}
      <div
        ref={containerRef}
        className={cn(
          'flex-1 relative',
          visible && !locked && 'cursor-pointer',
          locked && 'cursor-not-allowed bg-muted/30'
        )}
        onClick={handleTrackClick}
      >
        {/* Background grid lines */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/10 to-muted/20" />

        {/* Waveform visualization for audio tracks */}
        {shouldShowWaveform && containerWidth > 0 && (
          <div className="absolute inset-0 opacity-50 pointer-events-none">
            <WaveformTrack
              audioUrl={audioUrl}
              width={containerWidth}
              height={height - 4}
              pixelsPerMs={pixelsPerMs}
              currentTimeMs={currentTime}
              duration={duration}
              waveColor={VIZ_COLORS.waveform}
              progressColor={VIZ_COLORS.waveformProgress}
              showCursor={false}
            />
          </div>
        )}

        {/* Track items */}
        {sortedItems.map((item) => (
          <TrackItem
            key={item.id}
            item={item}
            trackType={track.type}
            pixelsPerMs={pixelsPerMs}
            height={height - 4}
            isSelected={selectedItemIds.has(item.id)}
            isLocked={locked}
            activeTool={activeTool}
            onSelect={(addToSelection) => onSelectItem(item.id, addToSelection)}
            onTrimStart={onTrimStart}
            onDragStart={onDragStart}
            onRazorClick={onRazorClick}
          />
        ))}

        {/* Locked overlay */}
        {locked && (
          <div className="absolute inset-0 bg-muted/10 backdrop-blur-[1px]" />
        )}
      </div>
    </div>
  )
})
