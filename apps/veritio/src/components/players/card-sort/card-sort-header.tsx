'use client'

import { Info, Circle, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface RecordingState {
  isRecording: boolean
  isPaused?: boolean
  isUploading?: boolean
  uploadProgress?: number
}

interface CardSortHeaderProps {
  hasInstructions: boolean
  onShowInstructions: () => void
  onSubmit: () => void
  submitDisabled: boolean
  finishedButtonText: string
  submitDisabledReason?: string
  recording?: RecordingState
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
      onClick={onSubmit}
      disabled={submitDisabled}
      className="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: 'var(--brand)',
        color: 'var(--brand-foreground)',
        borderRadius: 'var(--style-radius)',
      }}
    >
      {finishedButtonText}
    </button>
  )

  // Inline recording indicator component
  const renderRecordingIndicator = () => {
    if (!recording?.isRecording && !recording?.isUploading) return null

    if (recording.isUploading) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card/90 border border-border">
          <Upload className="h-4 w-4 shrink-0 animate-pulse" />
          <span className="text-sm font-medium">Uploading...</span>
          <span className="text-xs" style={{ color: 'var(--style-text-secondary)' }}>{recording.uploadProgress ?? 0}%</span>
        </div>
      )
    }

    if (recording.isPaused) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/90 text-white">
          <Circle className="h-3 w-3 fill-current shrink-0" />
          <span className="text-sm font-medium">Recording Paused</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card/90 border border-border">
        <div className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
        </div>
        <span className="text-sm font-medium text-foreground">Recording</span>
      </div>
    )
  }

  return (
    <div
      className="p-4 sticky top-0 z-10"
      style={{
        backgroundColor: 'var(--style-card-bg)',
        borderBottom: '1px solid var(--style-card-border)',
      }}
    >
      <div className="px-2">
        <div className="flex items-center justify-end">
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {hasInstructions && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShowInstructions}
              >
                <Info className="h-4 w-4 mr-2" />
                {t('common.viewInstructions')}
              </Button>
            )}
            {renderRecordingIndicator()}
            {submitDisabled && submitDisabledReason ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>{finishedButton}</span>
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
