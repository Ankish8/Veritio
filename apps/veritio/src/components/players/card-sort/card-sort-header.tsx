'use client'

import { AlertCircle, Circle, Info, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { AudioLevelIndicator } from '../shared/audio-level-indicator'
import type { RecordingProps } from './card-sort-types'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface CardSortHeaderProps {
  hasInstructions: boolean
  onShowInstructions: () => void
  onSubmit: () => void
  submitDisabled: boolean
  finishedButtonText: string
  submitDisabledReason?: string
  recording?: RecordingProps
}

export function CardSortHeader({
  hasInstructions,
  onShowInstructions,
  onSubmit,
  submitDisabled,
  finishedButtonText,
  submitDisabledReason,
  recording,
}: CardSortHeaderProps) {
  const t = useTranslations()

  const finishedButton = (
    <button
      type="button"
      onClick={onSubmit}
      disabled={submitDisabled}
      data-card-sort-finished-action
      className="shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: 'var(--brand)',
        color: 'var(--brand-foreground)',
        borderRadius: 'var(--style-radius)',
      }}
    >
      {finishedButtonText}
    </button>
  )

  const renderRecordingIndicator = () => {
    if (
      !recording?.isRecording &&
      !recording?.isUploading &&
      !recording?.error
    ) {
      return null
    }

    const statusClassName =
      'flex h-10 shrink-0 items-center gap-2 rounded-md px-3'

    if (recording.error) {
      return (
        <div
          className={`${statusClassName} bg-destructive/90 text-destructive-foreground`}
          data-card-sort-recording-status="error"
          role="status"
          aria-live="polite"
          aria-label="Recording Error"
          title="Recording Error"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="hidden text-sm font-medium sm:inline">
            Recording Error
          </span>
        </div>
      )
    }

    if (recording.isUploading) {
      const uploadProgress = recording.uploadProgress ?? 0

      return (
        <div
          className={`${statusClassName} border border-border bg-card/90`}
          data-card-sort-recording-status="uploading"
          role="status"
          aria-live="polite"
          aria-label={`Uploading recording: ${uploadProgress}%`}
          title={`Uploading recording: ${uploadProgress}%`}
        >
          <Upload className="h-4 w-4 shrink-0 animate-pulse" />
          <span className="hidden text-sm font-medium sm:inline">
            Uploading...
          </span>
          <span
            className="text-xs"
            style={{ color: 'var(--style-text-secondary)' }}
          >
            {uploadProgress}%
          </span>
        </div>
      )
    }

    if (recording.isPaused) {
      return (
        <div
          className={`${statusClassName} bg-amber-500/90 text-white`}
          data-card-sort-recording-status="paused"
          role="status"
          aria-live="polite"
          aria-label="Recording Paused"
          title="Recording Paused"
        >
          <Circle className="h-3 w-3 fill-current shrink-0" />
          <span className="hidden text-sm font-medium sm:inline">
            Recording Paused
          </span>
        </div>
      )
    }

    return (
      <div
        className={`${statusClassName} border border-border bg-card/90`}
        data-card-sort-recording-status="recording"
        role="status"
        aria-live="polite"
        aria-label="Recording"
        title="Recording"
      >
        <div className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
        </div>
        <span className="hidden text-sm font-medium text-foreground sm:inline">
          Recording
        </span>
        {recording.thinkAloudEnabled && (
          <AudioLevelIndicator
            audioLevel={recording.audioLevel ?? 0}
            isSpeaking={recording.isSpeaking ?? false}
            visible
            compact
          />
        )}
      </div>
    )
  }

  return (
    <div
      className="sticky top-0 z-10 p-3 sm:p-4"
      style={{
        backgroundColor: 'var(--style-card-bg)',
        borderBottom: '1px solid var(--style-card-border)',
      }}
    >
      <div className="px-0 sm:px-2">
        <div className="flex min-w-0 items-center justify-end">
          <div
            className="flex min-w-0 items-center justify-end gap-2"
            data-card-sort-header-actions
          >
            {hasInstructions && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShowInstructions}
                aria-label={t('common.viewInstructions')}
                title={t('common.viewInstructions')}
                className="px-3 sm:px-4"
              >
                <Info className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {t('common.viewInstructions')}
                </span>
              </Button>
            )}
            {renderRecordingIndicator()}
            {submitDisabled && submitDisabledReason ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="shrink-0">{finishedButton}</span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {submitDisabledReason}
                </TooltipContent>
              </Tooltip>
            ) : (
              finishedButton
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
