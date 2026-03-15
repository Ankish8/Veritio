/**
 * Participant Status Badge
 *
 * Subtle status indicator with colored dot and text.
 */

import { cn } from '@/lib/utils'
import type { ParticipantStatus } from '@/lib/supabase/panel-types'

interface ParticipantStatusBadgeProps {
  status: ParticipantStatus
  className?: string
}

const statusConfig: Record<
  ParticipantStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  active: {
    label: 'Active',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  inactive: {
    label: 'Inactive',
    dotClass: 'bg-slate-400 dark:bg-slate-500',
    textClass: 'text-muted-foreground',
  },
  blacklisted: {
    label: 'Blacklisted',
    dotClass: 'bg-red-500',
    textClass: 'text-red-600 dark:text-red-400',
  },
}

export function ParticipantStatusBadge({ status, className }: ParticipantStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClass)} />
      <span className={cn('text-sm', config.textClass)}>{config.label}</span>
    </div>
  )
}
