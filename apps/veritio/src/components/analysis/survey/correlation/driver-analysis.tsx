'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Info,
} from 'lucide-react'
import { cn, stripPipingHtml } from '@/lib/utils'
import type { DriverAnalysisData, DriverResult } from './types'
import { getCorrelationStrength } from '@/lib/algorithms/correlation-statistics'

interface DriverAnalysisProps {
  data: DriverAnalysisData
  maxDriversToShow?: number
}

export function DriverAnalysis({
  data,
  maxDriversToShow = 10,
}: DriverAnalysisProps) {
  const { targetQuestion, drivers } = data
  const topDrivers = drivers.slice(0, maxDriversToShow)

  // First driver has highest |coefficient| since drivers are pre-sorted
  const maxAbsCorrelation = useMemo(() => {
    if (topDrivers.length === 0) return 0
    return Math.abs(topDrivers[0].correlation.coefficient)
  }, [topDrivers])

  if (topDrivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Target className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No drivers found</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          No significant correlations were found with the target question.
          Try selecting a different target or adjusting the minimum sample size.
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Target question indicator */}
        <div className="pb-4 border-b">
          <div className="text-xs text-muted-foreground mb-1">Target Question</div>
          <div className="font-medium text-foreground">{stripPipingHtml(targetQuestion.text)}</div>
        </div>

        {/* Drivers list */}
        <div className="space-y-2">
          {topDrivers.map((driver, index) => (
            <DriverRow
              key={driver.questionId}
              driver={driver}
              index={index}
              maxAbsCorrelation={maxAbsCorrelation}
            />
          ))}
        </div>

        {/* Show more indicator */}
        {drivers.length > maxDriversToShow && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Showing top {maxDriversToShow} of {drivers.length} correlated questions
          </p>
        )}

        {/* Interpretation guide */}
        <Card className="bg-muted/30 border-muted">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>How to interpret:</strong> Questions with stronger positive
                correlations tend to move in the same direction as your target metric.
                Improving these "drivers" may positively impact the outcome. Negative
                correlations indicate inverse relationships.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}

function DriverRow({
  driver,
  index,
  maxAbsCorrelation,
}: {
  driver: DriverResult
  index: number
  maxAbsCorrelation: number
}) {
  const { correlation } = driver
  const coefficient = correlation.coefficient
  const isPositive = coefficient > 0
  const absCoefficient = Math.abs(coefficient)
  const strength = getCorrelationStrength(coefficient)

  // Calculate bar width relative to max correlation
  const barWidth = maxAbsCorrelation > 0
    ? (absCoefficient / maxAbsCorrelation) * 100
    : 0

  return (
    <div
      className={cn(
        'grid items-center py-3 px-4 rounded-lg border transition-colors',
        correlation.isSignificant
          ? 'bg-background hover:bg-muted/30'
          : 'bg-muted/10'
      )}
      style={{ gridTemplateColumns: '24px 1fr 32px 56px 88px' }}
    >
      {/* Rank number - col 1 */}
      <div className="text-center">
        <span className={cn(
          'text-sm font-medium tabular-nums',
          index < 3 ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {driver.rank}
        </span>
      </div>

      {/* Question text and bar - col 2 */}
      <div className="min-w-0 px-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <p className={cn(
              'text-sm cursor-help',
              correlation.isSignificant ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {stripPipingHtml(driver.questionText)}
            </p>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[400px]">
            <p style={{ color: '#ffffff' }}>{stripPipingHtml(driver.questionText)}</p>
          </TooltipContent>
        </Tooltip>

        {/* Correlation bar */}
        <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isPositive ? 'bg-emerald-500' : 'bg-red-500',
              !correlation.isSignificant && 'opacity-40'
            )}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Direction icon - col 3 */}
      <div className="flex justify-center">
        <div className={cn(
          'p-1.5 rounded',
          isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
          !correlation.isSignificant && 'opacity-50'
        )}>
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
        </div>
      </div>

      {/* Coefficient + Strength - col 4 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-right cursor-help">
            <div className={cn(
              'text-sm font-semibold tabular-nums',
              isPositive ? 'text-emerald-600' : 'text-red-600',
              !correlation.isSignificant && 'opacity-60'
            )}>
              {isPositive ? '+' : ''}{coefficient.toFixed(2)}
            </div>
            <div className="text-[12px] text-muted-foreground capitalize">
              {strength}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span style={{ color: '#a1a1aa' }}>p-value:</span>
              <span style={{ color: '#ffffff' }}>
                {correlation.pValue < 0.001
                  ? '< 0.001'
                  : correlation.pValue.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span style={{ color: '#a1a1aa' }}>Sample:</span>
              <span style={{ color: '#ffffff' }}>{correlation.n} respondents</span>
            </div>
            <div className="flex justify-between gap-4">
              <span style={{ color: '#a1a1aa' }}>Method:</span>
              <span className="capitalize" style={{ color: '#ffffff' }}>
                {correlation.method.replace('_', ' ')}
              </span>
            </div>
            {correlation.isSignificant && (
              <p style={{ color: '#34d399', borderTop: '1px solid #52525b', paddingTop: '4px' }}>
                ✓ Statistically significant
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Significance indicator - col 5 */}
      <div className="text-right">
        {!correlation.isSignificant && (
          <span className="text-[11px] text-muted-foreground">
            Not significant
          </span>
        )}
      </div>
    </div>
  )
}

export function DriverAnalysisEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Target className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
      <h3 className="text-lg font-medium mb-2">Select a target question</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Choose a question (like NPS or overall satisfaction) to see which other
        questions are most strongly correlated with it. This helps identify what
        "drives" your key metrics.
      </p>
    </div>
  )
}
