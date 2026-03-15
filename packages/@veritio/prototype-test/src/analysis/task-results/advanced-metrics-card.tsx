'use client'
import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@veritio/ui/components/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import { HelpCircle, Compass, Gauge, AlertTriangle } from 'lucide-react'
import { cn } from '@veritio/ui'
import type {
  LostnessResult,
  PathEfficiencyResult,
  ConfusionPoint,
} from '@veritio/prototype-test/algorithms/advanced-metrics'
import {
  getLostnessColorClass,
  getPathEfficiencyColorClass,
  formatLostnessInterpretation,
  formatPathEfficiencyInterpretation,
  formatDwellTime,
  LOSTNESS_THRESHOLDS,
} from '@veritio/prototype-test/algorithms/advanced-metrics'
// Types

interface AdvancedMetricsCardProps {
  lostness: LostnessResult | null
  pathEfficiency: PathEfficiencyResult | null
  confusionPoints?: ConfusionPoint[]
  maxConfusionPoints?: number
  className?: string
}
// Component
export function AdvancedMetricsCard({
  lostness,
  pathEfficiency,
  confusionPoints = [],
  maxConfusionPoints = 3,
  className,
}: AdvancedMetricsCardProps) {
  // Truncate confusion points
  const displayedConfusionPoints = useMemo(() => {
    return confusionPoints.slice(0, maxConfusionPoints)
  }, [confusionPoints, maxConfusionPoints])

  // Don't render if no data
  if (!lostness && !pathEfficiency) {
    return null
  }

  return (
    <TooltipProvider>
      <Card className={cn('border-0 shadow-none', className)}>
        <CardHeader className="pb-2 px-0 pt-0">
          <CardTitle className="text-base font-semibold">Advanced Navigation Metrics</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="space-y-4">
            {/* Metrics grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lostness Metric */}
              {lostness && (
                <LostnessMetricCard lostness={lostness} />
              )}

              {/* Path Efficiency Metric */}
              {pathEfficiency && (
                <PathEfficiencyMetricCard pathEfficiency={pathEfficiency} />
              )}
            </div>

            {/* Confusion Points (if any) */}
            {displayedConfusionPoints.length > 0 && (
              <ConfusionPointsList
                confusionPoints={displayedConfusionPoints}
                totalCount={confusionPoints.length}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
// Sub-components
function LostnessMetricCard({ lostness }: { lostness: LostnessResult }) {
  const colorClass = getLostnessColorClass(lostness.score)
  const interpretation = formatLostnessInterpretation(lostness.interpretation)

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header with title and help tooltip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium text-sm">Lostness</h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                <strong>Lostness (Smith 1996)</strong> measures navigation confusion.
                <br /><br />
                Formula: L = sqrt((N/S - 1)² + (R/N - 1)²) / sqrt(2)
                <br /><br />
                Where N = unique frames visited, S = optimal path length, R = total visits.
                <br /><br />
                Scale: 0 (direct) to 1 (completely lost)
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Score badge with color */}
        <div className={cn(
          'px-2.5 py-1 rounded-md text-sm font-bold tabular-nums border',
          colorClass
        )}>
          {lostness.score.toFixed(2)}
        </div>
      </div>

      {/* Interpretation bar */}
      <div className="space-y-1.5">
        <LostnessColorBar score={lostness.score} />
        <p className={cn('text-xs font-medium', colorClass.split(' ')[0])}>
          {interpretation}
        </p>
      </div>

      {/* Details */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t">
        <DetailItem label="Unique Frames" value={lostness.uniqueFramesVisited.toString()} />
        <DetailItem label="Total Visits" value={lostness.totalFrameVisits.toString()} />
        <DetailItem label="Optimal Path" value={lostness.optimalPathLength.toString()} />
      </div>
    </div>
  )
}
function LostnessColorBar({ score }: { score: number }) {
  // Calculate position (0-100%)
  const position = Math.min(score * 100, 100)

  return (
    <div className="relative h-2 rounded-full overflow-hidden bg-muted">
      {/* Color gradient background */}
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: '30%',
          background: 'linear-gradient(to right, #10b981, #10b981)',
        }}
      />
      <div
        className="absolute inset-y-0 rounded-full"
        style={{
          left: '30%',
          width: '30%',
          background: 'linear-gradient(to right, #10b981, #f59e0b)',
        }}
      />
      <div
        className="absolute inset-y-0 rounded-full"
        style={{
          left: '60%',
          width: '40%',
          background: 'linear-gradient(to right, #f59e0b, #ef4444)',
        }}
      />

      {/* Score indicator */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-foreground border-2 border-background shadow-sm"
        style={{ left: `calc(${position}% - 6px)` }}
      />
    </div>
  )
}
function PathEfficiencyMetricCard({ pathEfficiency }: { pathEfficiency: PathEfficiencyResult }) {
  const colorClass = getPathEfficiencyColorClass(pathEfficiency.score)
  const interpretation = formatPathEfficiencyInterpretation(pathEfficiency.interpretation)

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header with title and help tooltip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium text-sm">Path Efficiency</h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                <strong>Path Efficiency</strong> is a weighted composite score (0-100).
                <br /><br />
                Components:
                <br />• Adherence (40%): How close to optimal path
                <br />• Extra Steps (20%): Penalty for unnecessary frames
                <br />• Backtracks (30%): Penalty for backtracking
                <br />• Time (10%): Time vs benchmark
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Score badge with color */}
        <div className={cn(
          'px-2.5 py-1 rounded-md text-sm font-bold tabular-nums border',
          colorClass
        )}>
          {pathEfficiency.score.toFixed(0)}
        </div>
      </div>

      {/* Interpretation label */}
      <div className="space-y-1.5">
        <EfficiencyProgressBar score={pathEfficiency.score} />
        <p className={cn('text-xs font-medium', colorClass.split(' ')[0])}>
          {interpretation}
        </p>
      </div>

      {/* Component breakdown */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t">
        <ComponentBar label="Adherence" value={pathEfficiency.components.adherence} weight={40} />
        <ComponentBar label="Extra Steps" value={pathEfficiency.components.extraSteps} weight={20} />
        <ComponentBar label="Backtracks" value={pathEfficiency.components.backtracks} weight={30} />
        <ComponentBar label="Time" value={pathEfficiency.components.time} weight={10} />
      </div>
    </div>
  )
}
function EfficiencyProgressBar({ score }: { score: number }) {
  // Determine color based on score
  let bgColor = 'bg-red-500'
  if (score >= 80) bgColor = 'bg-emerald-500'
  else if (score >= 60) bgColor = 'bg-green-500'
  else if (score >= 40) bgColor = 'bg-amber-500'

  return (
    <div className="relative h-2 rounded-full overflow-hidden bg-muted">
      <div
        className={cn('absolute inset-y-0 left-0 rounded-full transition-all', bgColor)}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}
function ComponentBar({
  label,
  value,
  weight,
}: {
  label: string
  value: number
  weight: number
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{value.toFixed(0)} ({weight}%)</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/60"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium tabular-nums">{value}</p>
    </div>
  )
}
function ConfusionPointsList({
  confusionPoints,
  totalCount,
}: {
  confusionPoints: ConfusionPoint[]
  totalCount: number
}) {
  return (
    <div className="rounded-lg border bg-amber-50/50 dark:bg-amber-900/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h4 className="font-medium text-sm text-amber-800 dark:text-amber-300">
          Confusion Points ({totalCount})
        </h4>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-amber-600/60 dark:text-amber-400/60 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">
              Frames where participants spent &gt;2x the average dwell time,
              indicating potential confusion or difficulty.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-2">
        {confusionPoints.map((cp, index) => (
          <ConfusionPointItem key={`${cp.frameId}-${index}`} point={cp} />
        ))}
      </div>

      {totalCount > confusionPoints.length && (
        <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
          +{totalCount - confusionPoints.length} more confusion points
        </p>
      )}
    </div>
  )
}
function ConfusionPointItem({ point }: { point: ConfusionPoint }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded bg-amber-100/50 dark:bg-amber-900/20">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100 truncate">
          {point.frameName || `Frame ${point.frameId.slice(0, 8)}`}
        </p>
        <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
          Visit #{point.visitNumber} • {formatDwellTime(point.dwellTimeMs)}
        </p>
      </div>
      <div className="text-right">
        <span className="text-sm font-bold text-amber-700 dark:text-amber-300 tabular-nums">
          {point.ratio.toFixed(1)}x
        </span>
        <p className="text-[12px] text-amber-600/70 dark:text-amber-400/70">
          avg time
        </p>
      </div>
    </div>
  )
}
