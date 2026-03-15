'use client'
import { Badge } from '@veritio/ui/components/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import { HelpCircle } from 'lucide-react'
import {
  type LostnessStatus,
  getLostnessStatus,
  getLostnessStatusColor,
} from '../lib/algorithms/lostness-score'

interface LostnessIndicatorProps {
  score: number
  status?: LostnessStatus
  description?: string
  showTooltip?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}
const STATUS_LABELS: Record<LostnessStatus, string> = {
  perfect: 'Perfect',
  good: 'Good',
  acceptable: 'OK',
  problematic: 'Poor',
  lost: 'Lost',
}
export function LostnessIndicator({
  score,
  status: providedStatus,
  description: providedDescription,
  showTooltip = true,
  size = 'md',
  className,
}: LostnessIndicatorProps) {
  // Compute status if not provided
  const { status, description } = providedStatus
    ? { status: providedStatus, description: providedDescription || '' }
    : getLostnessStatus(score)

  const colors = getLostnessStatusColor(status)

  // Size-based styling
  const sizeClasses = {
    sm: { score: 'text-lg', badge: 'text-[12px] px-1 py-0' },
    md: { score: 'text-2xl', badge: 'text-xs px-1.5 py-0' },
    lg: { score: 'text-3xl', badge: 'text-sm px-2 py-0.5' },
  }

  const tooltipContent = (
    <div className="space-y-2 text-sm max-w-xs">
      <div className="font-medium">Lostness Score</div>
      <div className="text-muted-foreground">{description}</div>
      <div className="text-muted-foreground text-xs border-t pt-2">
        Measures how &quot;lost&quot; users were during navigation.
        Based on the Smith (1996) formula used in UX research.
      </div>
      <div className="text-xs text-muted-foreground">
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <span>0.0 - 0.1</span><span>Perfect</span>
          <span>0.1 - 0.3</span><span>Good</span>
          <span>0.3 - 0.5</span><span>Acceptable</span>
          <span>0.5 - 0.7</span><span>Problematic</span>
          <span>0.7+</span><span>Severely lost</span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground italic">
        Lower is better — 0 means optimal path taken
      </div>
    </div>
  )

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <span className={`font-bold ${colors.text} ${sizeClasses[size].score}`}>
        {score.toFixed(2)}
      </span>
      <Badge
        className={`${colors.bgLight} ${colors.text} border-0 font-semibold ${sizeClasses[size].badge}`}
      >
        {STATUS_LABELS[status]}
      </Badge>
      {showTooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="p-3">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
export function LostnessBadge({
  score,
  status: providedStatus,
  className,
}: Pick<LostnessIndicatorProps, 'score' | 'status' | 'className'>) {
  const { status } = providedStatus
    ? { status: providedStatus }
    : getLostnessStatus(score)

  const colors = getLostnessStatusColor(status)

  return (
    <Badge
      className={`${colors.bgLight} ${colors.text} border-0 font-semibold text-xs ${className || ''}`}
    >
      {score.toFixed(2)} · {STATUS_LABELS[status]}
    </Badge>
  )
}
