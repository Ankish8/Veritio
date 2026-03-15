'use client'

import { cn } from '@/lib/utils'
import {
  FIRST_CLICK_THRESHOLDS,
  getProblemIndicator,
} from '@/lib/constants/first-click-thresholds'
import {
  MetricProblemBadge,
} from '@/components/analysis/prototype-test/task-results/metric-problem-badge'

interface ClickAccuracyCardProps {
  accuracy: { meanDistance: number; meanScore: number; effectiveTargetWidth: number }
  className?: string
}

function getInterpretation(score: number): { label: string; colorClass: string } {
  if (score > 80) return { label: 'Excellent', colorClass: 'text-emerald-600 dark:text-emerald-400' }
  if (score > 60) return { label: 'Good', colorClass: 'text-blue-600 dark:text-blue-400' }
  if (score > 40) return { label: 'Fair', colorClass: 'text-amber-600 dark:text-amber-400' }
  return { label: 'Poor', colorClass: 'text-red-600 dark:text-red-400' }
}

export function ClickAccuracyCard({ accuracy, className }: ClickAccuracyCardProps) {
  const { meanScore, meanDistance, effectiveTargetWidth } = accuracy
  const interpretation = getInterpretation(meanScore)
  const problemType = getProblemIndicator(meanScore, FIRST_CLICK_THRESHOLDS.clickAccuracy)

  // Arc parameters for the gauge
  const radius = 36
  const circumference = Math.PI * radius // half-circle
  const progress = (meanScore / 100) * circumference

  // Arc color based on score
  const arcColor =
    meanScore > 80
      ? 'stroke-emerald-500'
      : meanScore > 60
        ? 'stroke-blue-500'
        : meanScore > 40
          ? 'stroke-amber-500'
          : 'stroke-red-500'

  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-4', className)}>
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">Click Accuracy</h4>
        {problemType && (
          <MetricProblemBadge
            type={problemType}
            tooltip="Click accuracy score is below 30. Clicks are landing far from the target."
          />
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Gauge arc */}
        <div className="relative w-20 h-12 shrink-0">
          <svg viewBox="0 0 80 44" className="w-full h-full overflow-visible">
            {/* Background arc */}
            <path
              d="M 4 40 A 36 36 0 0 1 76 40"
              fill="none"
              className="stroke-muted"
              strokeWidth={6}
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <path
              d="M 4 40 A 36 36 0 0 1 76 40"
              fill="none"
              className={arcColor}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={`${progress} ${circumference}`}
            />
          </svg>
          {/* Score in center of arc */}
          <div className="absolute inset-x-0 bottom-0 text-center">
            <span className="text-lg font-bold tabular-nums">{Math.round(meanScore)}</span>
          </div>
        </div>

        {/* Interpretation + secondary metrics */}
        <div className="flex-1 min-w-0 space-y-2">
          <span className={cn('text-sm font-semibold', interpretation.colorClass)}>
            {interpretation.label}
          </span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Mean Distance</span>
            <span className="tabular-nums font-medium text-foreground">
              {(meanDistance * 100).toFixed(1)}%
            </span>
            <span>Target Width</span>
            <span className="tabular-nums font-medium text-foreground">
              {(effectiveTargetWidth * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
