'use client'

/**
 * Statistical Significance Badge
 *
 * Displays the statistical significance of the comparison
 * with confidence level and winner indication.
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Trophy, Info, AlertCircle, CheckCircle2 } from 'lucide-react'

interface SignificanceBadgeProps {
  isSignificant: boolean
  confidenceLevel: number
  pValue: number
  winner: string | null
  designAName: string
  designBName: string
}

export function SignificanceBadge({
  isSignificant,
  confidenceLevel,
  pValue,
  winner,
  designAName,
  designBName,
}: SignificanceBadgeProps) {
  const winnerName = winner === designAName ? designAName : designBName

  if (isSignificant && winner) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <Trophy className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800 dark:text-green-200">
          Statistically Significant Result
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              <strong>{winnerName}</strong> outperforms with{' '}
              <strong>{confidenceLevel.toFixed(1)}%</strong> confidence.
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-help">
                    <Info className="h-3 w-3 mr-1" />
                    p = {pValue.toFixed(4)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium mb-1">What does this mean?</p>
                  <p className="text-xs text-muted-foreground">
                    The p-value ({pValue.toFixed(4)}) represents the probability
                    that this difference occurred by chance. A p-value below 0.05
                    means we&apos;re 95% confident the difference is real.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (isSignificant) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CheckCircle2 className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 dark:text-blue-200">
          Significant Difference Detected
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              There is a statistically significant difference between the designs
              ({confidenceLevel.toFixed(1)}% confidence).
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-help">
                    <Info className="h-3 w-3 mr-1" />
                    p = {pValue.toFixed(4)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium mb-1">Statistical Significance</p>
                  <p className="text-xs text-muted-foreground">
                    The chi-square test shows p = {pValue.toFixed(4)}, which is
                    below the 0.05 threshold for statistical significance.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        No Significant Difference
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            The observed difference between designs is not statistically significant.
            More responses may be needed to detect a difference.
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="cursor-help">
                  <Info className="h-3 w-3 mr-1" />
                  p = {pValue.toFixed(4)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">What does this mean?</p>
                <p className="text-xs text-muted-foreground">
                  The p-value ({pValue.toFixed(4)}) is above 0.05, meaning the
                  difference could be due to random chance. Consider collecting
                  more responses to increase statistical power.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </AlertDescription>
    </Alert>
  )
}
