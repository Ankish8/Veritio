'use client'

import { Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface RealtimeStatusProps {
  isConnected: boolean
  className?: string
}

/**
 * Shows real-time connection status with a subtle indicator.
 */
export function RealtimeStatus({ isConnected, className }: RealtimeStatusProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors',
              isConnected ? 'text-green-600' : 'text-muted-foreground',
              className
            )}
          >
            {isConnected ? (
              <>
                <div className="relative">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75" />
                </div>
                <span className="sr-only">Live updates active</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                <span className="sr-only">Disconnected</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isConnected ? 'Live updates active' : 'Reconnecting...'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * More detailed connection status with text.
 */
export function RealtimeStatusBadge({ isConnected, className }: RealtimeStatusProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        isConnected
          ? 'bg-green-100 text-green-700'
          : 'bg-muted text-muted-foreground',
        className
      )}
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>Live</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </>
      )}
    </div>
  )
}
