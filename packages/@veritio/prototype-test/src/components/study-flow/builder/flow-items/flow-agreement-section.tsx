'use client'

import { useState } from 'react'
import { Switch } from '@veritio/ui/components/switch'
import { cn, truncateText } from '@veritio/ui'
import { ChevronRight, Ban } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface FlowAgreementSectionProps {
  title: string
  description: string
  isActive: boolean
  isEnabled: boolean
  onSelect: () => void
  onToggle: () => void
  // Rejection settings
  showRejectionMessage?: boolean
  rejectionTitle?: string
  onSelectRejection?: () => void
  isRejectionSelected?: boolean
  icon?: LucideIcon
}
export function FlowAgreementSection({
  title,
  description,
  isActive,
  isEnabled,
  onSelect,
  onToggle,
  showRejectionMessage,
  rejectionTitle,
  onSelectRejection,
  isRejectionSelected,
  icon: Icon,
}: FlowAgreementSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const handleClick = () => {
    if (isEnabled) {
      onSelect()
      setIsExpanded(!isExpanded)
    }
  }

  // Show chevron and make expandable only when rejection message is enabled
  const hasSubItems = showRejectionMessage === true

  return (
    <div
      className={cn(
        'rounded-lg border transition-all overflow-hidden',
        isActive && isEnabled
          ? 'border-border bg-muted/40'
          : isEnabled
            ? 'border-border/50 bg-muted/20 hover:border-border'
            : 'border-dashed border-border/40 bg-muted/20'
      )}
    >
      {/* Section header */}
      <div
        role={isEnabled ? 'button' : undefined}
        tabIndex={isEnabled ? 0 : undefined}
        onClick={isEnabled ? handleClick : undefined}
        onKeyDown={
          isEnabled
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleClick()
                }
              }
            : undefined
        }
        className={cn(
          'w-full text-left px-4 py-2.5 transition-all',
          isEnabled ? 'cursor-pointer' : 'cursor-default'
        )}
        aria-current={isActive && isEnabled ? 'step' : undefined}
        aria-expanded={hasSubItems ? isExpanded && isEnabled : undefined}
      >
        <div className="flex items-center justify-between gap-4">
          <div className={cn('flex items-center gap-2 flex-1 min-w-0', !isEnabled && 'opacity-50')}>
            {hasSubItems && (
              <ChevronRight
                className={cn(
                  'h-4 w-4 transition-transform text-muted-foreground shrink-0 self-start mt-0.5',
                  isExpanded && isEnabled && 'rotate-90',
                  !isEnabled && 'opacity-30'
                )}
              />
            )}
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  'text-sm font-medium block',
                  isActive && isEnabled ? 'text-foreground' : 'text-foreground/80',
                  !isEnabled && 'text-muted-foreground'
                )}
              >
                {title}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>

          <Switch
            checked={isEnabled}
            onCheckedChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Toggle ${title}`}
            className="shrink-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Rejection message sub-item */}
      {hasSubItems && isExpanded && isEnabled && (
        <div className="px-4 pb-3 space-y-2">
          <div
            className={cn(
              'group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all cursor-pointer',
              isRejectionSelected
                ? 'bg-primary/5 border-primary/30'
                : 'bg-background border-border/50 hover:border-border hover:bg-muted/30'
            )}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onSelectRejection?.()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectRejection?.()
              }
            }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted shrink-0">
              <Ban className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block">
                {truncateText(rejectionTitle || 'Thank You', 24)}
              </span>
              <span className="text-xs text-muted-foreground">Rejection message</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
