'use client'

import { Switch } from '@veritio/ui/components/switch'
import { cn } from '@veritio/ui'
import type { LucideIcon } from 'lucide-react'

interface FlowStepItemProps {
  title: string
  description: string
  isActive: boolean
  isEnabled: boolean
  hasToggle: boolean
  onSelect: () => void
  onToggle?: () => void
  icon?: LucideIcon
}
export function FlowStepItem({
  title,
  description,
  isActive,
  isEnabled,
  hasToggle,
  onSelect,
  onToggle,
  icon: Icon,
}: FlowStepItemProps) {
  // Only handle click if enabled (or no toggle exists)
  const handleClick = () => {
    if (isEnabled || !hasToggle) {
      onSelect()
    }
    // If disabled with toggle, do nothing - only toggle switch is interactive
  }

  const isClickable = isEnabled || !hasToggle

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick()
              }
            }
          : undefined
      }
      className={cn(
        'w-full text-left rounded-lg border px-4 py-3 transition-all',
        isActive && (isEnabled || !hasToggle)
          ? 'border-border bg-muted/40'
          : isEnabled || !hasToggle
            ? 'border-border/50 bg-muted/20 hover:border-border cursor-pointer'
            : 'border-dashed border-border/40 bg-muted/20 cursor-default'
      )}
      aria-current={isActive && (isEnabled || !hasToggle) ? 'step' : undefined}
    >
      <div className="flex items-center justify-between gap-4">
        <div className={cn('flex items-center gap-3 flex-1 min-w-0', !isEnabled && hasToggle && 'opacity-50')}>
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-background border border-border shrink-0">
              <Icon className="h-4 w-4 text-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span
              className={cn(
                'text-sm font-medium block',
                isActive && (isEnabled || !hasToggle) ? 'text-foreground' : 'text-foreground/80',
                !isEnabled && hasToggle && 'text-muted-foreground'
              )}
            >
              {title}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          </div>
        </div>

        {hasToggle && onToggle && (
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Toggle ${title}`}
            className="shrink-0 cursor-pointer"
          />
        )}
      </div>
    </div>
  )
}
