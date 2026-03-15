import { cn } from '@/lib/utils'

export type StudyStatus = 'draft' | 'active' | 'paused' | 'completed'

interface StudyStatusBadgeProps {
  status: StudyStatus
  className?: string
}

const statusConfig: Record<StudyStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground',
  },
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  },
  paused: {
    label: 'Paused',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  },
  completed: {
    label: 'Completed',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  },
}

export function StudyStatusBadge({ status, className }: StudyStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
