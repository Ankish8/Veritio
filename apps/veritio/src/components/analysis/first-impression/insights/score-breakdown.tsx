'use client'

/**
 * Score Breakdown Component
 *
 * Displays the breakdown of the First Impression Score components
 * with individual progress bars and weights.
 */

import { Badge } from '@/components/ui/badge'
import type { ScoreBreakdown as ScoreBreakdownType } from '@/lib/algorithms/first-impression-score'

interface ScoreBreakdownProps {
  score: ScoreBreakdownType
  className?: string
}

/**
 * Displays the complete score breakdown with all components
 */
export function ScoreBreakdown({ score, className }: ScoreBreakdownProps) {
  return (
    <div className={`space-y-3 ${className || ''}`}>
      <ScoreBreakdownRow
        label="Response Rate"
        value={score.responseRateScore}
        weight="30%"
        description="Based on how many participants responded"
      />
      <ScoreBreakdownRow
        label="Positive Sentiment"
        value={score.positiveSentimentScore}
        weight="30%"
        description="Average rating normalized to 100"
      />
      <ScoreBreakdownRow
        label="Engagement Quality"
        value={score.engagementScore}
        weight="40%"
        description="Based on response time relative to expected"
      />
    </div>
  )
}

interface ScoreBreakdownRowProps {
  label: string
  value: number
  weight: string
  description?: string
}

/**
 * Individual score breakdown row with progress bar
 */
export function ScoreBreakdownRow({ label, value, weight, description }: ScoreBreakdownRowProps) {
  // Color based on value
  const getColorClass = (v: number) => {
    if (v >= 80) return 'bg-green-500'
    if (v >= 60) return 'bg-yellow-500'
    if (v >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex flex-col">
          <span className="text-muted-foreground">{label}</span>
          {description && (
            <span className="text-xs text-muted-foreground/70">{description}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {weight}
          </Badge>
          <span className="font-medium w-8 text-right">{value}</span>
        </div>
      </div>
      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${getColorClass(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
