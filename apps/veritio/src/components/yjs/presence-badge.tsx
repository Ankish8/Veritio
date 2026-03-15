'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PresenceUser {
  name: string
  email: string
  avatarUrl?: string
  color: string
  initials: string
  typing?: boolean
}

interface PresenceBadgeProps {
  user: PresenceUser
  otherCount?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline'
  size?: 'sm' | 'md'
  isTyping?: boolean
}

const positionClasses = {
  'top-right': 'absolute -top-2 -right-2',
  'top-left': 'absolute -top-2 -left-2',
  'bottom-right': 'absolute -bottom-2 -right-2',
  'bottom-left': 'absolute -bottom-2 -left-2',
  inline: 'relative',
}

const sizeClasses = {
  sm: 'h-5 w-5 text-[8px]',
  md: 'h-5 w-5 text-[9px]',
}

export function PresenceBadge({
  user,
  otherCount = 0,
  position = 'top-right',
  size = 'md',
  isTyping = false,
}: PresenceBadgeProps) {
  const showTyping = isTyping || user.typing

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`${positionClasses[position]} flex items-center gap-1 z-20`}>
            {/* Avatar badge */}
            <div
              className={`
                ${sizeClasses[size]}
                rounded-full flex items-center justify-center
                font-bold text-white shadow-sm border-2 border-white
                cursor-default transition-transform hover:scale-110
                ${showTyping ? 'animate-pulse' : ''}
              `}
              style={{ backgroundColor: user.color }}
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                user.initials
              )}
            </div>
            {/* Typing indicator */}
            {showTyping && (
              <span
                className="text-[12px] font-medium px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap animate-pulse"
                style={{ backgroundColor: user.color, color: 'white' }}
              >
                typing...
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">
            {user.name || user.email} {showTyping ? 'is typing...' : 'is editing'}
          </p>
          {otherCount > 0 && (
            <p className="text-muted-foreground">
              +{otherCount} other{otherCount > 1 ? 's' : ''}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface PresenceRingProps {
  color: string
  className?: string
}

export function PresenceRing({ color, className = '' }: PresenceRingProps) {
  return (
    <div
      className={`absolute -inset-[2px] rounded-xl pointer-events-none z-0 ${className}`}
      style={{ border: `2px solid ${color}` }}
    />
  )
}
