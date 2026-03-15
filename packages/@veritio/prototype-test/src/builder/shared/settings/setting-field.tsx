'use client'

import type { ReactNode } from 'react'
import {
  Label,
  cn,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui'
import { Info } from 'lucide-react'

export interface SettingFieldProps {
  id: string
  label: string
  description?: string
  tooltip?: string
  control: ReactNode
  when?: boolean
  disabled?: boolean
  variant?: 'horizontal' | 'vertical'
  className?: string
}
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
