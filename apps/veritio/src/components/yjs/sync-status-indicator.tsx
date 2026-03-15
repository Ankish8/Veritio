'use client'

import { memo, useState, useEffect } from 'react'
import { useYjsOptional } from './yjs-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { RefreshCw, Cloud, CloudOff, Users } from 'lucide-react'

interface SyncStatusIndicatorProps {
  showUserCount?: boolean
  size?: 'sm' | 'md'
  hideWhenSynced?: boolean
  className?: string
}

export const SyncStatusIndicator = memo(function SyncStatusIndicator({
  showUserCount = true,
  size = 'md',
  hideWhenSynced = true,
  className,
}: SyncStatusIndicatorProps) {
  const yjs = useYjsOptional()
  const [recentSync, setRecentSync] = useState(false)

  // Flash indicator when sync occurs
  useEffect(() => {
    if (!yjs?.provider) return

    const handleSync = (synced: boolean) => {
      if (synced) {
        setRecentSync(true)
        setTimeout(() => setRecentSync(false), 1000)
      }
    }

    yjs.provider.on('sync', handleSync)
    return () => {
      yjs.provider?.off('sync', handleSync)
    }
  }, [yjs?.provider])

  if (!yjs) return null

  const { status, isConnected, isSynced, users, reconnect } = yjs
  const userCount = users.length
  const canReconnect = status === 'disconnected'

  // Hide when fully synced and no issues (Option 3: contextual display)
  if (hideWhenSynced && status === 'connected' && isSynced) {
    return null
  }

  // Determine status display
  const getStatusInfo = () => {
    if (status === 'disconnected') {
      return {
        icon: CloudOff,
        color: 'text-red-500',
        bgColor: 'bg-red-100',
        label: 'Offline',
        description: 'Connection lost. Click to retry.',
      }
    }
    if (status === 'connecting') {
      return {
        icon: RefreshCw,
        color: 'text-amber-500',
        bgColor: 'bg-amber-100',
        label: 'Connecting',
        description: 'Establishing connection...',
        animate: true,
      }
    }
    if (!isSynced) {
      return {
        icon: RefreshCw,
        color: 'text-blue-500',
        bgColor: 'bg-blue-100',
        label: 'Syncing',
        description: 'Syncing changes...',
        animate: true,
      }
    }
    return {
      icon: Cloud,
      color: 'text-green-500',
      bgColor: 'bg-green-100',
      label: 'Synced',
      description: 'All changes saved',
    }
  }

  const statusInfo = getStatusInfo()
  const Icon = statusInfo.icon

  const sizeClasses = {
    sm: 'h-6 px-2 text-xs gap-1',
    md: 'h-8 px-3 text-sm gap-1.5',
  }

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
  }

  const handleClick = () => {
    if (canReconnect) {
      reconnect()
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          onClick={handleClick}
          disabled={!canReconnect}
          className={cn(
            'inline-flex items-center rounded-full border transition-all duration-300 bg-transparent',
            sizeClasses[size],
            recentSync && 'ring-2 ring-green-400 ring-opacity-50',
            canReconnect && 'cursor-pointer hover:bg-muted/50 active:scale-95',
            className
          )}
        >
          {/* Status icon */}
          <Icon
            className={cn(
              iconSizeClasses[size],
              statusInfo.color,
              statusInfo.animate && 'animate-spin'
            )}
          />

          {/* Status label */}
          <span className="font-medium text-muted-foreground">
            {statusInfo.label}
          </span>

          {/* User count badge */}
          {showUserCount && userCount > 0 && isConnected && (
            <div className="flex items-center gap-0.5 ml-1 pl-1.5 border-l">
              <Users className={cn(iconSizeClasses[size], 'text-muted-foreground')} />
              <span className="font-medium text-muted-foreground">
                {userCount}
              </span>
            </div>
          )}

          {/* Live indicator dot */}
          {isConnected && isSynced && (
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-medium">{statusInfo.label}</p>
          <p className="text-muted-foreground">{statusInfo.description}</p>
          {userCount > 0 && (
            <p className="text-muted-foreground mt-1">
              {userCount} collaborator{userCount > 1 ? 's' : ''} online
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})

export function SyncDot({ className }: { className?: string }) {
  const yjs = useYjsOptional()

  if (!yjs) return null

  const { status, isSynced } = yjs

  const getColor = () => {
    if (status === 'disconnected') return 'bg-red-500'
    if (status === 'connecting' || !isSynced) return 'bg-amber-500'
    return 'bg-green-500'
  }

  return (
    <span className={cn('relative flex h-2.5 w-2.5', className)}>
      {status === 'connected' && isSynced && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      )}
      <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', getColor())} />
    </span>
  )
}
