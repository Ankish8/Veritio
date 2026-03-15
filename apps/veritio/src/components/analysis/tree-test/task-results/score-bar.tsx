'use client'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  type FindabilityGrade,
  getFindabilityGrade,
  getFindabilityGradeColor,
  getFindabilityBadgeColor,
} from '@/lib/algorithms/findability-score'

interface ScoreBarProps {
  /** Findability score on 0-10 scale */
  score: number
  /** Pre-computed grade (optional - will be computed from score if not provided) */
  grade?: FindabilityGrade
  /** Grade description (optional - will be computed from score if not provided) */
  gradeDescription?: string
  className?: string
}

/**
 * Findability Score bar visualization on 0-10 scale.
 * Shows score with grade badge and dynamic color based on performance.
 */
export function ScoreBar({ score, grade: providedGrade, gradeDescription: providedDescription, className }: ScoreBarProps) {
  // Clamp score to 0-10
  const normalizedScore = Math.min(10, Math.max(0, score))
  const percentage = (normalizedScore / 10) * 100

  // Compute grade if not provided
  const { grade, gradeDescription } = providedGrade
    ? { grade: providedGrade, gradeDescription: providedDescription || '' }
    : getFindabilityGrade(score)

  const colors = getFindabilityGradeColor(grade)
  const badgeColors = getFindabilityBadgeColor(grade)

  const tooltipContent = (
    <div className="space-y-2 text-sm">
      <div className="font-medium">Findability Score</div>
      <div className="text-muted-foreground">
        {gradeDescription}
      </div>
      <div className="text-muted-foreground text-xs border-t pt-2">
        Calculated as: (Success Rate × 75%) + (Directness × 25%)
      </div>
      <div className="text-xs text-muted-foreground">
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <span>A+ (9.0+)</span><span>Excellent</span>
          <span>A (8.0-8.9)</span><span>Very good</span>
          <span>B (7.0-7.9)</span><span>Good</span>
          <span>C (6.0-6.9)</span><span>Average</span>
          <span>D (5.0-5.9)</span><span>Below average</span>
          <span>F (&lt;5.0)</span><span>Needs redesign</span>
        </div>
      </div>
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`space-y-1 cursor-help ${className || ''}`}>
            {/* Label with grade badge and score value */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Findability Score</span>
                <Badge
                  className={`${badgeColors.bg} ${badgeColors.text} border-0 font-bold text-xs px-1.5 py-0`}
                >
                  {grade}
                </Badge>
              </div>
              <span className={`font-semibold ${colors.text}`}>{score.toFixed(1)}/10</span>
            </div>

            {/* Bar container - matches bullet chart style */}
            <div className="h-10 bg-stone-200 rounded-sm overflow-hidden">
              {/* Filled portion - color based on grade */}
              <div
                className={`h-full ${colors.bg} transition-all duration-300`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Scale */}
            <div className="flex justify-between text-[12px] text-muted-foreground px-0.5">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
              <span>6</span>
              <span>7</span>
              <span>8</span>
              <span>9</span>
              <span>10</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="p-3 max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
