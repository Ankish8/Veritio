import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Clock,
  CheckCircle,
  Award,
  XCircle,
  Ban,
} from 'lucide-react'
import type { IncentiveStatus } from '@/lib/supabase/panel-types'

interface IncentiveStatusBadgeProps {
  status: IncentiveStatus
  className?: string
  showIcon?: boolean
}

const statusConfig: Record<
  IncentiveStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  promised: {
    label: 'Promised',
    icon: Award,
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
  },
  sent: {
    label: 'Sent',
    icon: CheckCircle,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
  },
  redeemed: {
    label: 'Redeemed',
    icon: Award,
    className: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
}

export function IncentiveStatusBadge({
  status,
  className,
  showIcon = true,
}: IncentiveStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant="outline" className={cn(config.className, 'font-medium', className)}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  )
}
