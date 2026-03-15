'use client'

import { CheckCircle2, Clock, Navigation } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { FirstClickSummary } from './first-click-types'

interface FirstClickSummaryBarProps {
  summary: FirstClickSummary
}

function formatTime(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function FirstClickSummaryBar({ summary }: FirstClickSummaryBarProps) {
  const {
    correctFirstClickRate,
    correctFirstClickPath,
    avgTimeToFirstClickMs,
  } = summary

  return (
    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
      {/* Success Rate */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground/70" />
            <span>Correct first click:</span>
            <span className="font-medium text-foreground">
              {correctFirstClickRate.toFixed(0)}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">
            Percentage of participants whose first click was on the correct path
            toward the answer. Higher is better — indicates clear labeling.
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Correct Path */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            <Navigation className="h-4 w-4 text-muted-foreground/70" />
            <span>Correct path:</span>
            <span className="font-medium text-foreground">
              {correctFirstClickPath}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">
            The path participants should click first to head toward the correct
            answer. Compare this to where participants actually clicked.
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Average Time */}
      {avgTimeToFirstClickMs !== null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <Clock className="h-4 w-4 text-muted-foreground/70" />
              <span>Avg. time:</span>
              <span className="font-medium text-foreground">
                {formatTime(avgTimeToFirstClickMs)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">
              Average time participants took before making their first click.
              Longer times may indicate confusion or unclear labels.
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
