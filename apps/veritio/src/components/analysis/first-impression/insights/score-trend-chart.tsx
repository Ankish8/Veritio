'use client'

/**
 * Score Trend Chart
 *
 * Displays historical First Impression scores over time.
 * Shows score progression across study iterations/benchmarks.
 *
 * When no historical data is available, displays the current score
 * with a placeholder indicating where trend data will appear.
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { TrendingUp, TrendingDown, Minus, Clock, Info } from 'lucide-react'
import type { ScoreBreakdown } from '@/lib/algorithms/first-impression-score'

/**
 * Historical score data point
 */
export interface ScoreDataPoint {
  /** Unique identifier for this benchmark */
  id: string
  /** Label for this data point (e.g., "v1.0", "Feb 2024") */
  label: string
  /** The First Impression score (0-100) */
  score: number
  /** Timestamp when this benchmark was captured */
  timestamp: string
  /** Number of participants in this benchmark */
  participantCount?: number
}

interface ScoreTrendChartProps {
  /** Current score breakdown */
  currentScore: ScoreBreakdown
  /** Historical score data points (oldest first) */
  historicalScores?: ScoreDataPoint[]
  /** Design name for context */
  designName?: string
}

export function ScoreTrendChart({
  currentScore,
  historicalScores = [],
  designName,
}: ScoreTrendChartProps) {
  // Combine historical scores with current score
  const allScores = useMemo(() => {
    const current: ScoreDataPoint = {
      id: 'current',
      label: 'Current',
      score: currentScore.totalScore,
      timestamp: new Date().toISOString(),
    }
    return [...historicalScores, current]
  }, [historicalScores, currentScore.totalScore])

  // Calculate trend from last score
  const trend = useMemo(() => {
    if (historicalScores.length === 0) return null

    const lastScore = historicalScores[historicalScores.length - 1].score
    const delta = currentScore.totalScore - lastScore
    const percentChange = lastScore > 0 ? (delta / lastScore) * 100 : 0

    return {
      delta,
      percentChange,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral',
    }
  }, [historicalScores, currentScore.totalScore])

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e' // green
    if (score >= 60) return '#eab308' // yellow
    if (score >= 40) return '#f97316' // orange
    return '#ef4444' // red
  }

  const hasHistory = historicalScores.length > 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Score Trend</CardTitle>
            <CardDescription>
              {designName
                ? `Historical scores for ${designName}`
                : 'Track score changes over time'}
            </CardDescription>
          </div>
          {trend && (
            <TrendBadge
              delta={trend.delta}
              percentChange={trend.percentChange}
              direction={trend.direction as 'up' | 'down' | 'neutral'}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasHistory ? (
          <TrendChart scores={allScores} getScoreColor={getScoreColor} />
        ) : (
          <EmptyTrendState currentScore={currentScore.totalScore} />
        )}
      </CardContent>
    </Card>
  )
}

// Trend Badge Component
interface TrendBadgeProps {
  delta: number
  percentChange: number
  direction: 'up' | 'down' | 'neutral'
}

function TrendBadge({ delta, percentChange, direction }: TrendBadgeProps) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus

  const colorClass =
    direction === 'up'
      ? 'bg-green-100 text-green-700 border-green-200'
      : direction === 'down'
        ? 'bg-red-100 text-red-700 border-red-200'
        : 'bg-gray-100 text-gray-700 border-gray-200'

  return (
    <Badge variant="outline" className={`gap-1 ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {delta > 0 ? '+' : ''}
      {delta} ({percentChange.toFixed(1)}%)
    </Badge>
  )
}

// Trend Chart Component
interface TrendChartProps {
  scores: ScoreDataPoint[]
  getScoreColor: (score: number) => string
}

function TrendChart({ scores, getScoreColor }: TrendChartProps) {
  const maxScore = 100
  const chartHeight = 160
  const chartPadding = { top: 20, bottom: 30, left: 40, right: 20 }

  // Calculate dimensions
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="relative" style={{ height: chartHeight }}>
        {/* Y-axis labels */}
        <div
          className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground"
          style={{ width: chartPadding.left - 8, paddingTop: chartPadding.top, paddingBottom: chartPadding.bottom }}
        >
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <svg
          className="w-full h-full"
          style={{ paddingLeft: chartPadding.left }}
        >
          {/* Grid lines */}
          <g className="text-muted-foreground/20">
            {[0, 50, 100].map((value) => {
              const y = chartPadding.top + innerHeight * (1 - value / maxScore)
              return (
                <line
                  key={value}
                  x1={chartPadding.left}
                  x2="100%"
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                />
              )
            })}
          </g>

          {/* Data points and line */}
          {scores.map((point, i) => {
            const x = chartPadding.left + ((i / (scores.length - 1 || 1)) * (100 - chartPadding.left - chartPadding.right))
            const y = chartPadding.top + innerHeight * (1 - point.score / maxScore)

            return (
              <g key={point.id}>
                {/* Line to next point */}
                {i < scores.length - 1 && (
                  <line
                    x1={`${x}%`}
                    y1={y}
                    x2={`${chartPadding.left + (((i + 1) / (scores.length - 1 || 1)) * (100 - chartPadding.left - chartPadding.right))}%`}
                    y2={chartPadding.top + innerHeight * (1 - scores[i + 1].score / maxScore)}
                    stroke={getScoreColor(point.score)}
                    strokeWidth="2"
                    className="opacity-50"
                  />
                )}

                {/* Data point */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <circle
                        cx={`${x}%`}
                        cy={y}
                        r={point.id === 'current' ? 8 : 6}
                        fill={getScoreColor(point.score)}
                        className="cursor-pointer transition-all hover:r-10"
                        stroke="white"
                        strokeWidth="2"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <p className="font-medium">{point.label}</p>
                        <p>Score: {point.score}</p>
                        {point.participantCount && (
                          <p>{point.participantCount} participants</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </g>
            )
          })}
        </svg>

        {/* X-axis labels */}
        <div
          className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground"
          style={{ paddingLeft: chartPadding.left, paddingRight: chartPadding.right }}
        >
          {scores.map((point) => (
            <span key={point.id} className={point.id === 'current' ? 'font-medium' : ''}>
              {point.label}
            </span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>80+</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span>60-79</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>40-59</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>&lt;40</span>
        </div>
      </div>
    </div>
  )
}

// Empty State Component
interface EmptyTrendStateProps {
  currentScore: number
}

function EmptyTrendState({ currentScore }: EmptyTrendStateProps) {
  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e'
    if (score >= 60) return '#eab308'
    if (score >= 40) return '#f97316'
    return '#ef4444'
  }

  return (
    <div className="space-y-4">
      {/* Visual representation with placeholder */}
      <div className="relative h-40 bg-muted/30 rounded-lg overflow-hidden">
        {/* Placeholder dotted line */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-full h-full" preserveAspectRatio="none">
            <line
              x1="10%"
              y1="70%"
              x2="85%"
              y2="50%"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="8 8"
              className="text-muted-foreground/30"
            />
          </svg>
        </div>

        {/* Current score dot */}
        <div
          className="absolute right-[10%] flex flex-col items-center"
          style={{
            top: `${100 - (currentScore / 100) * 80 - 10}%`,
          }}
        >
          <div
            className="w-4 h-4 rounded-full ring-4 ring-white shadow-lg"
            style={{ backgroundColor: getScoreColor(currentScore) }}
          />
          <span className="text-sm font-bold mt-1">{currentScore}</span>
          <span className="text-xs text-muted-foreground">Current</span>
        </div>

        {/* Placeholder text */}
        <div className="absolute left-4 bottom-4 flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-xs">Historical data will appear here</span>
        </div>
      </div>

      {/* Info message */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">No historical data yet</p>
          <p>
            Score trends will appear here when you save benchmarks for this study.
            Benchmarks let you track how your First Impression scores improve over
            design iterations.
          </p>
        </div>
      </div>
    </div>
  )
}
