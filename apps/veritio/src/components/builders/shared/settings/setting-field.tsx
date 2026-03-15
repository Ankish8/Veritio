'use client'

import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface SettingFieldProps {
  /** Unique ID for accessibility (links label to input) */
  id: string

  /** Label text */
  label: string

  /** Optional description text below label */
  description?: string

  /** Optional tooltip text shown next to label via info icon */
  tooltip?: string

  /** Input control (Switch, Select, etc.) */
  control: ReactNode

  /** Conditional rendering - only show when true (defaults to true) */
  when?: boolean

  /** Disabled state */
  disabled?: boolean

  /** Layout variant - horizontal puts control on right, vertical stacks */
  variant?: 'horizontal' | 'vertical'

  /** Additional classes for wrapper */
  className?: string
}

/** Internal layout wrapper - use SettingToggle, SettingSelect, etc. instead. */
export function SettingField({
  id,
  label,
  description,
  tooltip,
  control,
  when = true,
  disabled = false,
  variant = 'horizontal',
  className,
}: SettingFieldProps) {
  // Early return if condition not met
  if (!when) return null

  const labelElement = (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={id} className={cn(disabled && 'opacity-50')}>
        {label}
      </Label>
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px]">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )

  if (variant === 'vertical') {
    return (
      <div className={cn('space-y-2', className)}>
        {labelElement}
        {control}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    )
  }

  // Horizontal layout (default)
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="space-y-0.5 flex-1">
        {labelElement}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {control}
    </div>
  )
}
