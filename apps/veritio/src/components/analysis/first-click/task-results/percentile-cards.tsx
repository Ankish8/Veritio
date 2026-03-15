'use client'

import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { formatTime } from '@/components/analysis/shared/format-time'

interface PercentileCardsProps {
  percentiles: { p50: number; p75: number; p90: number; p95: number }
  className?: string
}

const PERCENTILE_LABELS = [
  { key: 'p50' as const, label: 'P50', description: 'Median' },
  { key: 'p75' as const, label: 'P75', description: '75th percentile' },
  { key: 'p90' as const, label: 'P90', description: '90th percentile' },
  { key: 'p95' as const, label: 'P95', description: '95th percentile' },
] as const

export function PercentileCards({ percentiles, className }: PercentileCardsProps) {
  const maxValue = Math.max(percentiles.p50, percentiles.p75, percentiles.p90, percentiles.p95)

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-1.5">
        <h4 className="text-sm font-medium">Time Percentiles</h4>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">Time thresholds at which a given percentage of participants completed their click. P50 (median) = half clicked faster. P90 = 90% clicked faster than this time.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {PERCENTILE_LABELS.map(({ key, label, description }) => {
          const value = percentiles[key]
          const progress = maxValue > 0 ? (value / maxValue) * 100 : 0

          return (
            <div
              key={key}
              className="rounded-lg border bg-card p-3 space-y-2"
            >
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <span className="text-xs text-muted-foreground/70">{description}</span>
              </div>
              <div className="text-lg font-bold tabular-nums">{formatTime(value)}</div>
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
