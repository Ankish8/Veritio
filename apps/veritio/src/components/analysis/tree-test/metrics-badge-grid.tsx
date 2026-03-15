'use client'

import { Badge } from '@/components/ui/badge'
import {
  getFindabilityGrade,
  getFindabilityGradeColor,
  getFindabilityBadgeColor,
} from '@/lib/algorithms/findability-score'
import {
  getLostnessStatus,
  getLostnessStatusColor,
  LOSTNESS_STATUS_LABELS,
} from '@/lib/algorithms/lostness-score'
import type { OverallMetrics } from '@/lib/algorithms/tree-test-analysis'

interface MetricsBadgeGridProps {
  metrics: OverallMetrics
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

interface MetricBadgeProps {
  label: string
  value: number
  description?: string
}

function MetricBadge({ label, value, description }: MetricBadgeProps) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={`text-2xl font-bold ${getScoreColor(value)}`}>
        {value.toFixed(1)}%
      </span>
      {description && (
        <span className="text-xs text-muted-foreground">{description}</span>
      )}
    </div>
  )
}

interface FindabilityMetricBadgeProps {
  metrics: OverallMetrics
}

function _FindabilityMetricBadge({ metrics }: FindabilityMetricBadgeProps) {
  const score = metrics.overallScore

  // Use pre-computed grade if available, otherwise compute it
  const { grade } = metrics.overallFindabilityGrade
    ? { grade: metrics.overallFindabilityGrade }
    : getFindabilityGrade(score / 10) // Convert 0-100 to 0-10 for grading

  const colors = getFindabilityGradeColor(grade)
  const badgeColors = getFindabilityBadgeColor(grade)

  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Findability Score</span>
        <Badge
          className={`${badgeColors.bg} ${badgeColors.text} border-0 font-bold text-[12px] px-1 py-0`}
        >
          {grade}
        </Badge>
      </div>
      <span className={`text-2xl font-bold ${colors.text}`}>
        {score.toFixed(1)}%
      </span>
      <span className="text-xs text-muted-foreground">weighted score</span>
    </div>
  )
}

function LostnessMetricBadge({ metrics }: { metrics: OverallMetrics }) {
  const score = metrics.overallLostness

  // Use pre-computed status if available, otherwise compute it
  const { status } = metrics.overallLostnessStatus
    ? { status: metrics.overallLostnessStatus }
    : getLostnessStatus(score)

  const colors = getLostnessStatusColor(status)

  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Lostness</span>
        <Badge
          className={`${colors.bgLight} ${colors.text} border-0 font-bold text-[12px] px-1 py-0`}
        >
          {LOSTNESS_STATUS_LABELS[status]}
        </Badge>
      </div>
      <span className={`text-2xl font-bold ${colors.text}`}>
        {score.toFixed(2)}
      </span>
      <span className="text-xs text-muted-foreground">lower is better</span>
    </div>
  )
}

export function MetricsBadgeGrid({ metrics }: MetricsBadgeGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricBadge
        label="Success Rate"
        value={metrics.overallSuccessRate}
        description="found correct answer"
      />
      <MetricBadge
        label="Directness"
        value={metrics.overallDirectnessRate}
        description="without backtracking"
      />
      <MetricBadge
        label="Direct Success"
        value={metrics.overallDirectSuccessRate}
        description="correct & direct"
      />
      <LostnessMetricBadge metrics={metrics} />
    </div>
  )
}
