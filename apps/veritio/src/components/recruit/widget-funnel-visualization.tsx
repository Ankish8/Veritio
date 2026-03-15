'use client'

import { memo } from 'react'
import { TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WidgetFunnelVisualizationProps {
  impressions: number
  clicks: number
  dismissals: number
  conversions: number
}

export const WidgetFunnelVisualization = memo(function WidgetFunnelVisualization({
  impressions,
  clicks,
  dismissals,
  conversions,
}: WidgetFunnelVisualizationProps) {
  // Calculate percentages
  const clickRate = impressions > 0 ? (clicks / impressions) * 100 : 0
  const dismissalRate = impressions > 0 ? (dismissals / impressions) * 100 : 0
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0

  // Calculate drop-off

  return (
    <div className="space-y-3">
      {/* Stage 1: Impressions (100% baseline) */}
      <FunnelStage
        label="Impressions"
        value={impressions}
        percentage={100}
        width={100}
        color="bg-blue-500"
        isFirst
      />

      {/* Stage 2: Clicks and Dismissals (split) */}
      <div className="pl-4 space-y-2">
        <FunnelStage
          label="Clicks"
          value={clicks}
          percentage={clickRate}
          width={clickRate}
          color="bg-green-500"
          dropOff={impressions - clicks - dismissals}
        />
        <FunnelStage
          label="Dismissals"
          value={dismissals}
          percentage={dismissalRate}
          width={dismissalRate}
          color="bg-amber-500"
        />
      </div>

      {/* Stage 3: Conversions */}
      <div className="pl-8">
        <FunnelStage
          label="Conversions"
          value={conversions}
          percentage={conversionRate}
          width={conversionRate}
          color="bg-green-600"
          dropOff={clicks - conversions}
          subtitle="Completed study"
        />
      </div>
    </div>
  )
})

// ============================================================================
// FUNNEL STAGE COMPONENT
// ============================================================================

function FunnelStage({
  label,
  value,
  percentage,
  width,
  color,
  dropOff,
  subtitle,
  isFirst = false,
}: {
  label: string
  value: number
  percentage: number
  width: number
  color: string
  dropOff?: number
  subtitle?: string
  isFirst?: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value.toLocaleString()} {!isFirst && `(${percentage.toFixed(1)}%)`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-8 bg-muted/30 rounded-md overflow-hidden relative">
        <div
          className={cn('h-full transition-all duration-500', color)}
          style={{ width: `${Math.max(2, width)}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
          {percentage.toFixed(1)}%
        </div>
      </div>

      {/* Drop-off indicator */}
      {dropOff !== undefined && dropOff > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground pl-2">
          <TrendingDown className="h-3 w-3" />
          <span>{dropOff.toLocaleString()} dropped off</span>
        </div>
      )}

      {subtitle && <p className="text-xs text-muted-foreground pl-2">{subtitle}</p>}
    </div>
  )
}
