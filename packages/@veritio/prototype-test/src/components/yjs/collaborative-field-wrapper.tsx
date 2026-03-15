'use client'
import { type ReactNode, useMemo } from 'react'
import { useCollaborativePresence, getUserInitials } from '@veritio/yjs'
import { cn } from '@veritio/ui'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui'

interface CollaborativeFieldWrapperProps {
  locationId: string
  children: ReactNode
  className?: string
  showLabel?: boolean
  showBadge?: boolean
  borderStyle?: 'ring' | 'border'
}

export function CollaborativeFieldWrapper({
  locationId,
  children,
  className,
  showLabel = false,
  showBadge = true,
  borderStyle = 'ring',
}: CollaborativeFieldWrapperProps) {
  const { primaryUser, usersAtLocation } = useCollaborativePresence(locationId)

  // No collaborator editing this field
  if (!primaryUser) {
    return <div className={className}>{children}</div>
  }

  const initials = getUserInitials(primaryUser.name, primaryUser.email)
  const otherCount = usersAtLocation.length - 1

  return (
    <TooltipProvider>
      <div className={cn('relative', className)}>
        {/* User label above field */}
        {showLabel && (
          <div
            className="absolute -top-5 left-2 text-xs font-medium px-1.5 py-0.5 rounded-t-md z-10"
            style={{
              backgroundColor: primaryUser.color,
              color: 'white',
            }}
          >
            {primaryUser.name || primaryUser.email}
            {otherCount > 0 && ` +${otherCount}`}
          </div>
        )}

        {/* Presence ring overlay - separate element to avoid clipping */}
        <div
          className="absolute -inset-[2px] rounded-xl pointer-events-none z-0"
          style={{
            border: `2px solid ${primaryUser.color}`,
          }}
        />

        {/* Content wrapper */}
        <div className="relative">
          {children}

          {/* Mini avatar badge in corner */}
          {showBadge && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white shadow-sm cursor-default z-10 transition-transform hover:scale-110"
                  style={{ backgroundColor: primaryUser.color }}
                >
                  {primaryUser.avatarUrl ? (
                    <img
                      src={primaryUser.avatarUrl}
                      alt={primaryUser.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-medium">
                  {primaryUser.name || primaryUser.email} is editing
                </p>
                {otherCount > 0 && (
                  <p className="text-muted-foreground">
                    +{otherCount} other{otherCount > 1 ? 's' : ''}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
