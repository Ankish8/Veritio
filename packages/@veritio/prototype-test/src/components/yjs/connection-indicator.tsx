'use client'
import { useYjsOptional } from './yjs-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui'
import { cn } from '@veritio/ui'
import { RefreshCw } from 'lucide-react'

interface ConnectionIndicatorProps {
  className?: string
  showLabel?: boolean
  alwaysShow?: boolean
}

export function ConnectionIndicator({
  className,
  showLabel = false,
  alwaysShow = false,
}: ConnectionIndicatorProps) {
  const yjs = useYjsOptional()

  if (!yjs) return null

  const { status, isSynced, error, reconnect } = yjs

  // Hide when connected and synced - everything is working
  if (!alwaysShow && status === 'connected' && isSynced && !error) return null

  // Determine display state
  let color = 'bg-yellow-500'
  let label = 'Connecting...'
  let description = 'Establishing connection'
  let showSpinner = true

  if (error) {
    color = 'bg-red-500'
    label = 'Error'
    description = error
    showSpinner = false
  } else if (status === 'disconnected') {
    color = 'bg-red-500'
    label = 'Offline'
    description = 'Connection lost. Retrying...'
    showSpinner = false
  } else if (status === 'connected' && !isSynced) {
    color = 'bg-yellow-500'
    label = 'Syncing...'
    description = 'Synchronizing data'
    showSpinner = true
  } else if (status === 'connected' && isSynced) {
    color = 'bg-green-500'
    label = 'Connected'
    description = 'Real-time collaboration active'
    showSpinner = false
  }

  const canReconnect = status === 'disconnected' || error

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={canReconnect ? reconnect : undefined}
            disabled={!canReconnect}
            className={cn(
              'flex items-center gap-1.5',
              canReconnect && 'cursor-pointer hover:opacity-80',
              !canReconnect && 'cursor-default',
              className
            )}
          >
            {showSpinner ? (
              <RefreshCw className="h-3 w-3 text-yellow-500 animate-spin" />
            ) : (
              <div className={cn('h-2 w-2 rounded-full', color)} />
            )}
            {showLabel && (
              <span className="text-xs text-muted-foreground">{label}</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {canReconnect && (
            <p className="text-xs text-primary mt-1">Click to reconnect</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
