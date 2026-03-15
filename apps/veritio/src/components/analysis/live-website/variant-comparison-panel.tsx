'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatTime, cn } from '@/lib/utils'
import type { LiveWebsiteMetrics } from '@/services/results/live-website-overview'

function DeltaIndicator({
  value,
  higherIsBetter = true,
  suffix,
  formatValue,
}: {
  value: number
  higherIsBetter?: boolean
  suffix?: string
  formatValue?: (v: number) => string
}) {
  if (Math.abs(value) < 0.01) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
        <Minus className="h-3 w-3" />
        same
      </span>
    )
  }
  const isPositive = value > 0
  const isGood = higherIsBetter ? isPositive : !isPositive
  const Icon = isPositive ? TrendingUp : TrendingDown
  const display = formatValue ? formatValue(value) : `${isPositive ? '+' : ''}${value.toFixed(1)}${suffix || ''}`
  return (
    <span className={cn('text-xs flex items-center gap-0.5', isGood ? 'text-emerald-600' : 'text-red-600')}>
      <Icon className="h-3 w-3" />
      {display}
    </span>
  )
}

interface VariantStat {
  name: string
  metrics: LiveWebsiteMetrics
}

interface VariantComparisonPanelProps {
  variantA: VariantStat
  variantB: VariantStat
  trackingMode: string
}

interface MetricRow {
  label: string
  valueA: string
  valueB: string
  rawA: number
  rawB: number
  higherIsBetter: boolean
  suffix?: string
  formatDelta?: (v: number) => string
}

export function VariantComparisonPanel({
  variantA,
  variantB,
  trackingMode,
}: VariantComparisonPanelProps) {
  const isUrlOnly = trackingMode === 'url_only'

  const completionRateA = variantA.metrics.totalParticipants > 0
    ? (variantA.metrics.completedParticipants / variantA.metrics.totalParticipants) * 100
    : 0
  const completionRateB = variantB.metrics.totalParticipants > 0
    ? (variantB.metrics.completedParticipants / variantB.metrics.totalParticipants) * 100
    : 0

  const rows: MetricRow[] = [
    {
      label: 'Participants',
      valueA: String(variantA.metrics.totalParticipants),
      valueB: String(variantB.metrics.totalParticipants),
      rawA: variantA.metrics.totalParticipants,
      rawB: variantB.metrics.totalParticipants,
      higherIsBetter: true,
    },
    {
      label: 'Completion Rate',
      valueA: `${completionRateA.toFixed(1)}%`,
      valueB: `${completionRateB.toFixed(1)}%`,
      rawA: completionRateA,
      rawB: completionRateB,
      higherIsBetter: true,
      suffix: 'pp',
    },
    {
      label: 'Success Rate',
      valueA: `${(variantA.metrics.overallSuccessRate * 100).toFixed(1)}%`,
      valueB: `${(variantB.metrics.overallSuccessRate * 100).toFixed(1)}%`,
      rawA: variantA.metrics.overallSuccessRate * 100,
      rawB: variantB.metrics.overallSuccessRate * 100,
      higherIsBetter: true,
      suffix: 'pp',
    },
    {
      label: 'Avg. Time/Task',
      valueA: formatTime(variantA.metrics.avgTimePerTask),
      valueB: formatTime(variantB.metrics.avgTimePerTask),
      rawA: variantA.metrics.avgTimePerTask,
      rawB: variantB.metrics.avgTimePerTask,
      higherIsBetter: false,
      formatDelta: (v) => `${v > 0 ? '+' : '-'}${formatTime(Math.abs(v))}`,
    },
    {
      label: 'Usability Score',
      valueA: variantA.metrics.usabilityScore > 0 ? String(variantA.metrics.usabilityScore) : '—',
      valueB: variantB.metrics.usabilityScore > 0 ? String(variantB.metrics.usabilityScore) : '—',
      rawA: variantA.metrics.usabilityScore,
      rawB: variantB.metrics.usabilityScore,
      higherIsBetter: true,
    },
    ...(!isUrlOnly ? [
      {
        label: 'Direct Success',
        valueA: `${(variantA.metrics.overallDirectSuccessRate * 100).toFixed(1)}%`,
        valueB: `${(variantB.metrics.overallDirectSuccessRate * 100).toFixed(1)}%`,
        rawA: variantA.metrics.overallDirectSuccessRate * 100,
        rawB: variantB.metrics.overallDirectSuccessRate * 100,
        higherIsBetter: true,
        suffix: 'pp',
      },
      {
        label: 'Avg. Pages/Task',
        valueA: variantA.metrics.avgPagesPerTask.toFixed(1),
        valueB: variantB.metrics.avgPagesPerTask.toFixed(1),
        rawA: variantA.metrics.avgPagesPerTask,
        rawB: variantB.metrics.avgPagesPerTask,
        higherIsBetter: false,
      },
    ] : []),
  ]

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4">
        {/* Header row with variant names */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{variantA.name}</span>
            <span className="text-xs text-muted-foreground">{variantA.metrics.totalParticipants} participants</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Variant Comparison</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{variantB.name}</span>
            <span className="text-xs text-muted-foreground">{variantB.metrics.totalParticipants} participants</span>
          </div>
        </div>

        {/* Metric cards in a horizontal row */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
          {rows.map((row) => {
            const delta = row.rawB - row.rawA
            return (
              <div key={row.label} className="rounded-md border bg-muted/30 px-3 py-2.5 text-center space-y-1">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">{row.valueA}</span>
                  <DeltaIndicator value={delta} higherIsBetter={row.higherIsBetter} suffix={row.suffix} formatValue={row.formatDelta} />
                  <span className="text-sm font-semibold tabular-nums">{row.valueB}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
