'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AlertTriangle, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ProblemType = 'high' | 'low' | null

interface MetricProblemBadgeProps {
  type: ProblemType
  /** Custom tooltip text explaining the threshold */
  tooltip?: string
  className?: string
}

export function MetricProblemBadge({
  type,
  tooltip,
  className,
}: MetricProblemBadgeProps) {
  if (!type) return null

  const isHigh = type === 'high'
  const label = isHigh ? 'HIGH' : 'LOW'

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[12px] font-semibold rounded uppercase tracking-wide',
        isHigh
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        className
      )}
    >
      {isHigh ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {label}
    </span>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[200px]">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return badge
}

export const METRIC_BADGE_TOOLTIPS = {
  success: {
    low: 'Success rate is below 50%. Consider reviewing the task design or prototype flow.',
  },
  directness: {
    low: 'Directness is below 40%. Many users are backtracking, indicating navigation confusion.',
  },
  misclicks: {
    high: 'Misclick rate exceeds 25%. Users are clicking on non-interactive areas frequently.',
  },
  time: {
    high: 'Average time exceeds 2 minutes. The task may be too complex or confusing.',
  },
  score: {
    low: 'Task score is below 5/10. This task needs significant improvement.',
  },
} as const
