'use client'

import { memo } from 'react'
import { Cloud, CloudOff, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { usePlatform } from '@/hooks/use-platform'
import type { SaveStatus } from '@/stores/study-builder'

interface SaveStatusIndicatorProps {
  status: SaveStatus
  className?: string
}

export function SaveStatusIndicator({ status, className }: SaveStatusIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs transition-opacity duration-300',
        status === 'idle' && 'opacity-0',
        status !== 'idle' && 'opacity-100',
        className
      )}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3.5 w-3.5 text-green-600" />
          <span className="text-green-600">Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <CloudOff className="h-3.5 w-3.5 text-destructive" />
          <span className="text-destructive">Save failed</span>
        </>
      )}
    </div>
  )
}

interface AutoSaveStatusProps {
  isDirty: boolean
  status: SaveStatus
  lastSavedAt: number | null
  /** Hide indicator when idle and not dirty (show only during transitions/errors) */
  hideWhenIdle?: boolean
  className?: string
  onSaveNow?: () => void
}

export const AutoSaveStatus = memo(function AutoSaveStatus({ isDirty, status, lastSavedAt, hideWhenIdle = true, className, onSaveNow }: AutoSaveStatusProps) {
  const { modifierSymbol } = usePlatform()

  const getRelativeTime = (timestamp: number) => {
    // eslint-disable-next-line react-hooks/purity
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  // All states are always rendered (hidden via CSS) to prevent Radix Tooltip
  // mount/unmount cycles that trigger compose-refs → setState infinite loops in React 19.
  const showSaving = status === 'saving'
  const showSaved = status === 'saved'
  const showError = status === 'error'
  const showDirty = status === 'idle' && isDirty
  const showLastSaved = status === 'idle' && !isDirty && !!lastSavedAt && !hideWhenIdle

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', !showSaving && 'hidden')}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Saving...</span>
      </div>

      <div className={cn('flex items-center gap-1.5 text-xs text-green-600', !showSaved && 'hidden')}>
        <Cloud className="h-3.5 w-3.5" />
        <span>Saved</span>
      </div>

      <div className={cn('flex items-center gap-1.5 text-xs text-destructive', !showError && 'hidden')}>
        <CloudOff className="h-3.5 w-3.5" />
        <span>Save failed</span>
      </div>

      <Tooltip>
        <TooltipTrigger
          type="button"
          onClick={onSaveNow}
          disabled={!onSaveNow}
          className={cn(
            'flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 cursor-pointer transition-colors group disabled:cursor-default',
            !showDirty && 'hidden'
          )}
        >
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 group-hover:bg-amber-600" />
          <span className="whitespace-nowrap group-hover:underline group-disabled:no-underline">Unsaved changes</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span>Click to save</span>
          <kbd className="ml-2 text-muted-foreground">{modifierSymbol}+S</kbd>
        </TooltipContent>
      </Tooltip>

      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', !showLastSaved && 'hidden')}>
        <Cloud className="h-3.5 w-3.5 shrink-0" />
        <span className="whitespace-nowrap">Saved {lastSavedAt ? getRelativeTime(lastSavedAt) : ''}</span>
      </div>
    </div>
  )
})
