'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface EmptyStateCardProps {
  /** Icon component from lucide-react */
  icon: LucideIcon

  /** Title text */
  title: string

  /** Description text (can be string or ReactNode for formatting) */
  description: string | ReactNode

  /** Primary action button config */
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }

  /** Optional secondary content (e.g., help text or link) */
  secondaryContent?: ReactNode

  /** Variant: 'card' (full Card wrapper) or 'inline' (border-dashed, no card) */
  variant?: 'card' | 'inline'

  /** Additional wrapper classes */
  className?: string
}

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  action,
  secondaryContent,
  variant = 'card',
  className,
}: EmptyStateCardProps) {
  const content = (
    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-5">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6">{description}</p>

      {action && (
        <Button onClick={action.onClick}>
          {action.icon && <action.icon className="h-4 w-4 mr-2" />}
          {action.label}
        </Button>
      )}

      {secondaryContent && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground/70">
          {secondaryContent}
        </div>
      )}
    </div>
  )

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'rounded-md border border-dashed p-8 text-center',
          className
        )}
      >
        {content}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="py-16">{content}</CardContent>
    </Card>
  )
}
