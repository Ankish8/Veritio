'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  X,
  FileVideo,
  FileAudio,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Trash2,
  Play,
  Download,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { formatBytes } from '@/lib/utils/format'
import type { Recording } from '@/hooks/use-recordings'

const STATUS_CONFIG = {
  uploading: { label: 'Uploading', variant: 'secondary' as const, icon: Loader2 },
  processing: { label: 'Processing', variant: 'secondary' as const, icon: Loader2 },
  ready: { label: 'Ready', variant: 'default' as const, icon: FileVideo },
  transcribing: { label: 'Transcribing', variant: 'secondary' as const, icon: Loader2 },
  completed: { label: 'Completed', variant: 'default' as const, icon: CheckCircle },
  failed: { label: 'Failed', variant: 'destructive' as const, icon: AlertCircle },
  abandoned: { label: 'Abandoned', variant: 'outline' as const, icon: AlertCircle },
  deleted: { label: 'Deleted', variant: 'outline' as const, icon: Trash2 },
}

const CAPTURE_MODE_LABELS = {
  audio: 'Audio Only',
  screen_audio: 'Screen + Audio',
  screen_audio_webcam: 'Screen + Audio + Webcam',
}

const formatDuration = (ms: number | null): string => {
  if (!ms) return '—'
  const seconds = Math.floor(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export interface RecordingDetailPanelProps {
  /** Recording data */
  recording: Recording
  /** Participant display number */
  participantNumber: number
  /** Close panel handler */
  onClose: () => void
  /** Navigate to prev/next recording */
  onNavigate: (direction: 'prev' | 'next') => void
  /** Can navigate to previous */
  canNavigatePrev: boolean
  /** Can navigate to next */
  canNavigateNext: boolean
  /** Open full player */
  onOpenPlayer?: () => void
  /** Delete recording */
  onDelete?: () => void
  /** Download recording */
  onDownload?: () => void
}

/**
 * Recording detail panel content for the right sidebar.
 * Shows recording metadata, stats, and actions.
 */
export function RecordingDetailPanel({
  recording,
  participantNumber,
  onClose,
  onNavigate,
  canNavigatePrev,
  canNavigateNext,
  onOpenPlayer,
  onDelete,
  onDownload,
}: RecordingDetailPanelProps) {
  const statusConfig = STATUS_CONFIG[recording.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.failed
  const StatusIcon = statusConfig.icon
  const captureMode = CAPTURE_MODE_LABELS[recording.capture_mode] || recording.capture_mode

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onNavigate('prev')}
            disabled={!canNavigatePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold">Participant {participantNumber}</h2>
            <p className="text-xs text-muted-foreground">Recording Details</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onNavigate('next')}
            disabled={!canNavigateNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge variant={statusConfig.variant} className="gap-2 px-4 py-2">
              <StatusIcon className="h-4 w-4" />
              <span className="font-medium">{statusConfig.label}</span>
            </Badge>
          </div>

          {/* Recording Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={
                recording.capture_mode === 'audio'
                  ? <FileAudio className="h-5 w-5 text-muted-foreground" />
                  : <FileVideo className="h-5 w-5 text-muted-foreground" />
              }
              label="Type"
              value={captureMode}
            />
            <StatCard
              icon={<Clock className="h-5 w-5 text-muted-foreground" />}
              label="Duration"
              value={formatDuration(recording.duration_ms)}
            />
            <StatCard
              label="File Size"
              value={recording.file_size_bytes ? formatBytes(recording.file_size_bytes) : '—'}
            />
            <StatCard
              label="Recorded"
              value={formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
            />
          </div>

          {/* Transcript Info */}
          {(recording.capture_mode === 'audio' ||
            recording.capture_mode === 'screen_audio' ||
            recording.capture_mode === 'screen_audio_webcam') && (
            <Section title="Transcript">
              <div className="bg-muted/50 rounded-lg p-4">
                {recording.transcript_status === 'no_speech_detected' ? (
                  <p className="text-sm text-muted-foreground italic">No speech detected</p>
                ) : recording.has_transcript ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Available</span>
                      <Badge variant="outline" className="text-xs">
                        {recording.transcript_word_count || 0} words
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click "Open Player" to view the full transcript with timestamps
                    </p>
                  </div>
                ) : recording.transcript_status === 'processing' ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Processing transcript...</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No transcript available</p>
                )}
              </div>
            </Section>
          )}

          {/* Actions */}
          <Section title="Actions">
            <div className="space-y-2">
              {onOpenPlayer && (
                <Button
                  className="w-full"
                  onClick={onOpenPlayer}
                  disabled={recording.status !== 'completed' && recording.status !== 'ready'}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Open Player
                </Button>
              )}
              {onDownload && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onDownload}
                  disabled={!recording.file_size_bytes}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Recording
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={onDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Recording
                </Button>
              )}
            </div>
          </Section>

          {/* Recording ID (for debugging) */}
          <Section title="Technical Info">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Recording ID</p>
                <p className="text-xs font-mono">{recording.id}</p>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

// Helper components

function StatCard({ value, label, icon }: { value?: string; label: string; icon?: ReactNode }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      {icon && (
        <div className="flex justify-center mb-2">{icon}</div>
      )}
      {value && (
        <div className="text-sm font-semibold text-center">{value}</div>
      )}
      <div className="text-xs text-muted-foreground mt-1 text-center">{label}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  )
}
