'use client'

import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label?: string
  value?: string | number
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  comparison?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
}

export function MetricCard({ label, value, unit, trend, comparison, propStatus }: MetricCardProps) {
  const isStreaming = propStatus?.value === 'streaming'
  const hasValue = value !== undefined && value !== null

  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-1">
      {!hasValue && isStreaming && (
        <div className="space-y-2">
          <div className="animate-pulse bg-muted rounded h-7 w-24" />
          <div className="animate-pulse bg-muted rounded h-3 w-16" />
        </div>
      )}

      {!hasValue && !isStreaming && (
        <p className="text-xs text-muted-foreground">No data</p>
      )}

      {hasValue && (
        <>
          <div className={cn('flex items-baseline gap-1.5', isStreaming && 'animate-pulse')}>
            <span className="text-2xl font-semibold text-foreground">{value}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            {trend && (
              <span
                className={cn(
                  'ml-1 flex items-center',
                  trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
                  trend === 'down' && 'text-red-600 dark:text-red-400',
                  trend === 'neutral' && 'text-muted-foreground'
                )}
              >
                {trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
                {trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
                {trend === 'neutral' && <Minus className="h-3.5 w-3.5" />}
              </span>
            )}
          </div>
          {label && <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>}
          {comparison && <p className="text-xs text-muted-foreground">{comparison}</p>}
        </>
      )}
    </div>
  )
}
