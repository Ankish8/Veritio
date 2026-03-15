'use client'
import { Badge } from '@veritio/ui/components/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import { Info } from 'lucide-react'
import {
  type FindabilityGrade,
  getFindabilityGrade,
  getFindabilityGradeColor,
  getFindabilityBadgeColor,
} from '../lib/algorithms/findability-score'

interface FindabilityGaugeProps {
  score: number
  grade?: FindabilityGrade
  gradeDescription?: string
  title?: string
  showFormula?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}
export function FindabilityGauge({
  score,
  grade: providedGrade,
  gradeDescription: providedDescription,
  title = 'Findability Score',
  showFormula = true,
  size = 'md',
  className,
}: FindabilityGaugeProps) {
  // Compute grade if not provided
  const { grade, gradeDescription } = providedGrade
    ? { grade: providedGrade, gradeDescription: providedDescription || '' }
    : getFindabilityGrade(score)

  const colors = getFindabilityGradeColor(grade)
  const badgeColors = getFindabilityBadgeColor(grade)

  // SVG configuration based on size
  const sizeConfig = {
    sm: { size: 120, radius: 45, strokeWidth: 8 },
    md: { size: 160, radius: 60, strokeWidth: 10 },
    lg: { size: 200, radius: 75, strokeWidth: 12 },
  }
  const config = sizeConfig[size]

  // Complete Tailwind class names (cannot use string interpolation)
  const fontSizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  }
  const subFontSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  // Calculate SVG circle parameters
  const circumference = 2 * Math.PI * config.radius
  // Score is 0-10, so normalize to 0-1 for the arc
  const normalizedScore = Math.min(10, Math.max(0, score)) / 10
  const strokeDashoffset = circumference - normalizedScore * circumference
  const center = config.size / 2

  return (
    <div className={className}>
      {/* Header with title and formula tooltip */}
      {(title || showFormula) && (
        <div className="flex items-center justify-between mb-2">
          {title && (
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
          )}
          {showFormula && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-help text-xs">
                    <Info className="h-3 w-3 mr-1" />
                    Formula
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium mb-2">Score Formula</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    (Success Rate × 75%) + (Directness × 25%)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scaled to 0-10, where 10 is perfect findability.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}

      {/* Circular Gauge */}
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: config.size, height: config.size }}>
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={config.radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={config.strokeWidth}
              className="text-muted"
            />
            {/* Progress circle */}
            <circle
              cx={center}
              cy={center}
              r={config.radius}
              fill="none"
              stroke={colors.stroke}
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {/* Score text in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-bold ${colors.text} ${fontSizeClasses[size]}`}>
              {score.toFixed(1)}
            </span>
            <span className={`text-muted-foreground ${subFontSizeClasses[size]}`}>
              out of 10
            </span>
            <Badge
              className={`mt-1 ${badgeColors.bg} ${badgeColors.text} border-0 font-bold`}
            >
              {grade}
            </Badge>
          </div>
        </div>

        {/* Grade description */}
        <p className="text-sm text-muted-foreground text-center mt-2">
          {gradeDescription}
        </p>
      </div>
    </div>
  )
}
