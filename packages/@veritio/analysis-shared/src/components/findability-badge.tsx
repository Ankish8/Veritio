'use client'
import { Badge } from '@veritio/ui/components/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import { cn } from '@veritio/ui'
import {
  type FindabilityGrade,
  getFindabilityGrade,
  getFindabilityBadgeColor,
} from '../lib/algorithms/findability-score'

interface FindabilityBadgeProps {
  score: number
  grade?: FindabilityGrade
  gradeDescription?: string
  showGrade?: boolean
  showTooltip?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}
export function FindabilityBadge({
  score,
  grade: providedGrade,
  gradeDescription: providedDescription,
  showGrade = true,
  showTooltip = true,
  size = 'md',
  className,
}: FindabilityBadgeProps) {
  // Compute grade if not provided
  const { grade, gradeDescription } = providedGrade
    ? { grade: providedGrade, gradeDescription: providedDescription || '' }
    : getFindabilityGrade(score)

  const colors = getFindabilityBadgeColor(grade)

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const badgeSizeClasses = {
    sm: 'text-xs px-1.5 py-0',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2 py-0.5',
  }

  const content = (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className={cn('font-semibold', sizeClasses[size], colors.text)}>
        {score.toFixed(1)}
      </span>
      {showGrade && (
        <Badge
          variant="secondary"
          className={cn(
            'font-bold border-0',
            badgeSizeClasses[size],
            colors.bg,
            colors.text
          )}
        >
          {grade}
        </Badge>
      )}
    </div>
  )

  if (!showTooltip) {
    return content
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{content}</div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">Findability Score</div>
            <div className="text-sm text-muted-foreground">
              <p className="mb-1">{gradeDescription}</p>
              <p className="text-xs">
                Calculated as: (Success Rate × 75%) + (Directness × 25%)
              </p>
            </div>
            <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
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
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
