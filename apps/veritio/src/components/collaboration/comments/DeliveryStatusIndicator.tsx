'use client'

import { Loader2, Clock, CheckCheck, AlertCircle, RotateCcw, X } from 'lucide-react'
import type { DeliveryStatus } from './types'

interface DeliveryStatusIndicatorProps {
  status?: DeliveryStatus
  onRetry?: () => void
  onDismiss?: () => void
  isRetrying?: boolean
}

export function DeliveryStatusIndicator({
  status,
  onRetry,
  onDismiss,
  isRetrying,
}: DeliveryStatusIndicatorProps) {
  if (!status || status === 'sent') {
    return (
      <CheckCheck className="h-3 w-3 text-primary-foreground/60" />
    )
  }

  if (status === 'pending') {
    return (
      <Clock className="h-3 w-3 text-primary-foreground/60 animate-pulse" />
    )
  }

  return (
    <div className="flex items-center gap-1">
      <AlertCircle className="h-3 w-3 text-destructive" />
      <span className="text-[12px] text-destructive">Failed</span>
      {onRetry && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRetry()
          }}
          disabled={isRetrying}
          className="ml-1 text-[12px] text-primary underline hover:no-underline disabled:opacity-50"
        >
          {isRetrying ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className="flex items-center gap-0.5">
              <RotateCcw className="h-2.5 w-2.5" />
              Retry
            </span>
          )}
        </button>
      )}
      {onDismiss && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="text-[12px] text-muted-foreground hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
