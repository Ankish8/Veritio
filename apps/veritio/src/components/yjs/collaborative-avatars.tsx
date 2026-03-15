'use client'

import { memo } from 'react'
import { useYjsOptional } from './yjs-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { getUserInitials } from '@veritio/yjs'

interface CollaborativeAvatarsProps {
  className?: string
  maxVisible?: number
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[12px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
}

export const CollaborativeAvatars = memo(function CollaborativeAvatars({
  className,
  maxVisible = 3,
  size = 'sm',
}: CollaborativeAvatarsProps) {
  const yjs = useYjsOptional()

  if (!yjs || yjs.users.length === 0) return null

  const { users } = yjs
  const visibleUsers = users.slice(0, maxVisible)
  const hiddenCount = users.length - maxVisible

  return (
    <TooltipProvider>
      <div className={cn('flex items-center -space-x-2', className)}>
        {visibleUsers.map(({ clientId, user, isActive }) => (
          <Tooltip key={clientId}>
            <TooltipTrigger
              className={cn(
                'flex items-center justify-center rounded-full border-2 shadow-sm transition-opacity duration-300 p-0 bg-transparent',
                sizeClasses[size],
                isActive ? 'border-white opacity-100' : 'border-gray-400 opacity-40'
              )}
              style={{ backgroundColor: user.color }}
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name || 'User'}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="font-medium text-white">
                  {getUserInitials(user.name, user.email)}
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p className="font-medium">
                {user.name || user.email}
                {!isActive && <span className="ml-1.5 text-muted-foreground">(Away)</span>}
              </p>
              <p className="text-muted-foreground">
                {user.email !== user.name && user.email}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}

        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger
              className={cn(
                'flex items-center justify-center rounded-full border-2 border-white bg-stone-500 shadow-sm p-0',
                sizeClasses[size]
              )}
            >
              <span className="font-medium text-white">+{hiddenCount}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p className="font-medium">{hiddenCount} more</p>
              {users.slice(maxVisible).map(({ clientId, user }) => (
                <p key={clientId} className="text-muted-foreground">
                  {user.name || user.email}
                </p>
              ))}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
})
