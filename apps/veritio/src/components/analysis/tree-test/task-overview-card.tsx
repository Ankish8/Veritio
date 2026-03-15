'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  getFindabilityGradeColor,
  getFindabilityBadgeColor,
} from '@/lib/algorithms/findability-score'
import {
  getLostnessStatusColor,
  LOSTNESS_STATUS_LABELS,
} from '@/lib/algorithms/lostness-score'
import type { TaskMetrics, LostnessStatus } from '@/lib/algorithms/tree-test-analysis'

interface TaskOverviewCardProps {
  task: TaskMetrics
  index: number
}

interface MetricCardProps {
  label: string
  value: string
  percentage: number
  color: 'success' | 'directness' | 'findability' | 'lostness'
  tooltip: string
  /** For findability score, provide the grade for dynamic coloring */
  grade?: TaskMetrics['findabilityGrade']
  /** For lostness, provide the status for dynamic coloring */
  lostnessStatus?: LostnessStatus
}

// Color classes for non-findability/lostness metrics
const colorClasses = {
  success: 'bg-emerald-400/70',
  directness: 'bg-slate-400',
}

function MetricCard({ label, value, percentage, color, tooltip, grade, lostnessStatus }: MetricCardProps) {
  // For findability score, use grade-based colors
  let barColor = colorClasses[color as keyof typeof colorClasses] || 'bg-slate-400'
  let badgeColors: { bg: string; text: string } | null = null
  let badgeLabel: string | null = null

  if (color === 'findability' && grade) {
    barColor = getFindabilityGradeColor(grade).bg
    badgeColors = getFindabilityBadgeColor(grade)
    badgeLabel = grade
  } else if (color === 'lostness' && lostnessStatus) {
    const lostnessColors = getLostnessStatusColor(lostnessStatus)
    barColor = lostnessColors.bg
    badgeColors = { bg: lostnessColors.bgLight, text: lostnessColors.text }
    badgeLabel = LOSTNESS_STATUS_LABELS[lostnessStatus]
  }

  return (
    <Card className="flex-1 border-border/50">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">{label}</span>
            {badgeColors && badgeLabel && (
              <Badge
                className={`${badgeColors.bg} ${badgeColors.text} border-0 font-bold text-[12px] px-1 py-0`}
              >
                {badgeLabel}
              </Badge>
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="text-2xl font-semibold mb-2">{value}</div>
        <div className="h-1.5 rounded-full bg-stone-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function TaskOverviewCard({ task, index }: TaskOverviewCardProps) {
  return (
    <div className="space-y-3 py-4 border-b border-border last:border-b-0">
      {/* Task header */}
      <div className="flex items-start gap-3">
        <Badge variant="secondary" className="shrink-0">
          Task {index + 1}
        </Badge>
        <p className="text-sm text-foreground leading-relaxed">{task.question}</p>
      </div>

      {/* Metrics row - 2x2 grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Success %"
          value={`${Math.round(task.successRate)}%`}
          percentage={task.successRate}
          color="success"
          tooltip="Percentage of participants who selected a correct answer for this task"
        />
        <MetricCard
          label="Directness %"
          value={`${Math.round(task.directnessRate)}%`}
          percentage={task.directnessRate}
          color="directness"
          tooltip="Percentage of participants who completed the task without backtracking"
        />
        <MetricCard
          label="Lostness"
          value={task.averageLostness.toFixed(2)}
          percentage={Math.max(0, 100 - task.averageLostness * 100)}
          color="lostness"
          lostnessStatus={task.lostnessStatus}
          tooltip="How 'lost' users were during navigation. Lower is better (0 = optimal path). Based on the Smith (1996) formula."
        />
        <MetricCard
          label="Findability"
          value={`${task.taskScore.toFixed(1)}/10`}
          percentage={task.taskScore * 10}
          color="findability"
          grade={task.findabilityGrade}
          tooltip="Findability score combining success rate (75%) and directness (25%), scaled to 0-10. Higher scores indicate better information architecture."
        />
      </div>
    </div>
  )
}
