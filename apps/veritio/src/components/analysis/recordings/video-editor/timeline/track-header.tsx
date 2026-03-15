'use client'

/**
 * Track Header Component
 *
 * Displays the track label and controls in the left panel of each track.
 * Controls include:
 * - Visibility toggle (eye icon)
 * - Audio mute toggle (speaker icon)
 * - Lock toggle (padlock icon)
 */

import { memo } from 'react'
import { Eye, EyeOff, Volume2, VolumeX, Lock, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TrackType, TrackProperties } from '@/lib/video-editor/tracks/track-types'

export interface TrackHeaderProps {
  id: string
  type: TrackType
  name: string
  properties: TrackProperties
  isSelected: boolean
  onSelect: () => void
  onToggleVisibility: () => void
  onToggleAudio: () => void
  onToggleLock: () => void
}

/** Colors for different track types */
const TRACK_COLORS: Record<TrackType, string> = {
  screen: 'bg-emerald-500/20 border-emerald-500/50',
  webcam: 'bg-sky-500/20 border-sky-500/50',
  clips: 'bg-blue-500/20 border-blue-500/50',
  annotations: 'bg-amber-500/20 border-amber-500/50',
  markers: 'bg-violet-500/20 border-violet-500/50',
}

/** Icons for different track types */
const TRACK_ICONS: Record<TrackType, string> = {
  screen: '🖥️',
  webcam: '📷',
  clips: '🎬',
  annotations: '✏️',
  markers: '📌',
}

export const TrackHeader = memo(function TrackHeader({
  id: _id,
  type,
  name,
  properties,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleAudio,
  onToggleLock,
}: TrackHeaderProps) {
  const { visible, audioEnabled, locked, color } = properties

  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 p-1.5 border-r transition-colors cursor-pointer',
        isSelected ? 'bg-primary/10' : 'bg-muted/50 hover:bg-muted/70',
        TRACK_COLORS[type]
      )}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: color || 'transparent',
      }}
      onClick={onSelect}
    >
      {/* Track name and type indicator */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm" title={type}>
          {TRACK_ICONS[type]}
        </span>
        <span
          className={cn(
            'text-xs font-medium truncate',
            !visible && 'text-muted-foreground opacity-50'
          )}
        >
          {name}
        </span>
      </div>

      {/* Track controls */}
      <div className="flex items-center gap-0.5">
        {/* Visibility toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisibility()
          }}
          className={cn(
            'h-5 w-5 p-0',
            visible ? 'text-foreground' : 'text-muted-foreground/50'
          )}
          title={visible ? 'Hide track' : 'Show track'}
        >
          {visible ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
        </Button>

        {/* Audio toggle (only for screen/webcam/clips) */}
        {(type === 'screen' || type === 'webcam' || type === 'clips') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onToggleAudio()
            }}
            className={cn(
              'h-5 w-5 p-0',
              audioEnabled ? 'text-foreground' : 'text-muted-foreground/50'
            )}
            title={audioEnabled ? 'Mute' : 'Unmute'}
          >
            {audioEnabled ? (
              <Volume2 className="h-3 w-3" />
            ) : (
              <VolumeX className="h-3 w-3" />
            )}
          </Button>
        )}

        {/* Lock toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock()
          }}
          className={cn(
            'h-5 w-5 p-0',
            locked ? 'text-amber-500' : 'text-muted-foreground/50'
          )}
          title={locked ? 'Unlock track' : 'Lock track'}
        >
          {locked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  )
})
