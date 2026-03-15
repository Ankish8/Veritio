'use client'

import { memo } from 'react'
import { Loader2, AlertCircle, CheckCircle2, CircleDot, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Recording } from '@/hooks/use-recordings'
import { resolveParticipantDisplay, extractDemographicsFromMetadata } from '@/lib/utils/participant-display'
import type { Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'

export const STATUS_CONFIG = {
  uploading: { label: 'Uploading', icon: Loader2, iconClassName: 'animate-spin', canPlay: false },
  processing: { label: 'Processing', icon: Loader2, iconClassName: 'animate-spin', canPlay: false },
  ready: { label: 'Ready', icon: CircleDot, iconClassName: '', canPlay: true },
  transcribing: { label: 'Transcribing', icon: Loader2, iconClassName: 'animate-spin', canPlay: true },
  completed: { label: 'Completed', icon: CheckCircle2, iconClassName: '', canPlay: true },
  failed: { label: 'Failed', icon: AlertCircle, iconClassName: '', canPlay: false },
  abandoned: { label: 'Abandoned', icon: AlertCircle, iconClassName: '', canPlay: false },
  deleted: { label: 'Deleted', icon: Trash2, iconClassName: '', canPlay: false },
}

export const formatDuration = (ms: number | null): string => {
  if (!ms) return '-'
  const seconds = Math.floor(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface RecordingCardProps {
  recording: Recording
  participantNumber: number
  participant?: Participant
  displaySettings?: ParticipantDisplaySettings | null
  isActive: boolean
  onClick: (recording: Recording) => void
  onPreload?: () => void
}

export const RecordingCard = memo(function RecordingCard({
  recording,
  participantNumber,
  participant,
  displaySettings,
  isActive,
  onClick,
  onPreload,
}: RecordingCardProps) {
  const statusConfig = STATUS_CONFIG[recording.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.failed
  const StatusIcon = statusConfig.icon
  const canPlay = statusConfig.canPlay

  const demographics = extractDemographicsFromMetadata(participant?.metadata)
  const display = resolveParticipantDisplay(displaySettings, {
    index: participantNumber,
    demographics,
  })

  return (
    <button
      type="button"
      className={`w-full text-left px-3 py-2.5 border-b transition-colors ${
        isActive
          ? 'bg-accent border-l-2 border-l-primary'
          : canPlay
            ? 'hover:bg-muted/50 border-l-2 border-l-transparent'
            : 'opacity-50 cursor-not-allowed border-l-2 border-l-transparent'
      }`}
      onClick={() => canPlay && onClick(recording)}
      onMouseEnter={canPlay ? onPreload : undefined}
      disabled={!canPlay}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{display.primary}</p>
          {display.secondary && (
            <p className="text-xs text-muted-foreground truncate">{display.secondary}</p>
          )}
        </div>
        <span className="font-mono text-xs text-muted-foreground flex-shrink-0">
          {formatDuration(recording.duration_ms)}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <StatusIcon className={`h-3 w-3 flex-shrink-0 ${statusConfig.iconClassName}`} />
        <span className="text-xs text-muted-foreground">{statusConfig.label}</span>
        {recording.transcript_word_count != null && recording.transcript_word_count > 0 && (
          <>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{recording.transcript_word_count.toLocaleString()} words</span>
          </>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
        </span>
      </div>
    </button>
  )
})
