'use client'

import React, { useMemo } from 'react'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { castJson } from '@/lib/supabase/json-utils'
import type {
  SemanticDifferentialQuestionConfig,
  SemanticDifferentialResponseValue,
} from '@veritio/study-types/study-flow-types'
import { calculateDescriptiveStats } from './descriptive-stats'

interface SemanticDifferentialVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface ScaleStatistics {
  scaleId: string
  leftLabel: string
  rightLabel: string
  mean: number
  median: number
  stdDev: number
  count: number
}

export const SemanticDifferentialVisualization = React.memo(function SemanticDifferentialVisualization({
  question,
  responses,
}: SemanticDifferentialVisualizationProps) {
  const config = castJson<SemanticDifferentialQuestionConfig>(
    question.config,
    { scalePoints: 7, scales: [] }
  )

  const scalePoints = config.scalePoints ?? 7
  const maxValue = Math.floor(scalePoints / 2)  // 3 for 7-point, 2 for 5-point, etc.

  const normalizeToCentered = (value: number, scalePoints: number): number | null => {
    const maxValue = Math.floor(scalePoints / 2)

    if (value >= -maxValue && value <= maxValue) {
      return value
    }

    if (value >= 1 && value <= scalePoints) {
      return value - 1 - maxValue
    }

    return null
  }

  const scaleStats = useMemo(() => {
    const stats: ScaleStatistics[] = []

    for (const scale of config.scales || []) {
      const values: number[] = []

      for (const response of responses) {
        const rawValue = (response.response_value as SemanticDifferentialResponseValue)?.[scale.id]

        if (rawValue !== undefined && rawValue !== null && typeof rawValue === 'number') {
          const centeredValue = normalizeToCentered(rawValue, scalePoints)

          if (centeredValue !== null) {
            values.push(centeredValue)
          }
        }
      }

      const desc = calculateDescriptiveStats(values)

      stats.push({
        scaleId: scale.id,
        leftLabel: scale.leftLabel || 'Left',
        rightLabel: scale.rightLabel || 'Right',
        mean: desc?.mean ?? 0,
        median: desc?.median ?? 0,
        stdDev: desc?.stdDev ?? 0,
        count: values.length,
      })
    }

    return stats
  }, [config.scales, responses, scalePoints])

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No responses yet</p>
      </div>
    )
  }

  if (!config.scales || config.scales.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Invalid question configuration</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {responses.length} responses · {config.scales.length} scales · {scalePoints} points
      </div>

      <div className="space-y-3">

        <div className="space-y-2">
          {scaleStats.map((stat) => (
            <ScaleBar
              key={stat.scaleId}
              leftLabel={stat.leftLabel}
              rightLabel={stat.rightLabel}
              mean={stat.mean}
              scalePoints={scalePoints}
              maxValue={maxValue}
            />
          ))}
        </div>

        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded bg-red-500/70" />
            <span>Negative</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-px h-3 bg-border" />
            <span>Neutral</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded bg-green-500/70" />
            <span>Positive</span>
          </div>
        </div>
      </div>
    </div>
  )
})

function ScaleBar({
  leftLabel,
  rightLabel,
  mean,
  scalePoints,
  maxValue,
}: {
  leftLabel: string
  rightLabel: string
  mean: number
  scalePoints: number
  maxValue: number
}) {
  const percentage = ((mean + maxValue) / (maxValue * 2)) * 100

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground w-32 text-right shrink-0">
          {leftLabel}
        </span>
        <span className="font-semibold text-sm px-4">
          <span className={mean < 0 ? 'text-red-600 dark:text-red-400' : mean > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
            {mean > 0 ? '+' : ''}{mean.toFixed(1)}
          </span>
        </span>
        <span className="text-foreground w-32 text-left shrink-0">
          {rightLabel}
        </span>
      </div>

      <div className="relative h-6 bg-muted rounded-lg overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border z-10" />

        {mean !== 0 && (
          <div
            className={`absolute top-0 bottom-0 transition-all ${
              mean < 0
                ? 'bg-red-500/70 hover:bg-red-500/80'
                : 'bg-green-500/70 hover:bg-green-500/80'
            }`}
            style={{
              left: mean < 0 ? `${percentage}%` : '50%',
              width: `${Math.abs(percentage - 50)}%`,
            }}
          />
        )}

        <div className="absolute inset-0 flex items-center justify-between px-1">
          {Array.from({ length: scalePoints }, (_, i) => {
            const value = i - maxValue
            const isCenter = value === 0
            return (
              <div
                key={i}
                className={`w-px h-2 ${isCenter ? 'bg-border' : 'bg-border/30'}`}
                title={`${value > 0 ? '+' : ''}${value}`}
              />
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground/60 px-1">
        <span>-{maxValue}</span>
        <span>0</span>
        <span>+{maxValue}</span>
      </div>
    </div>
  )
}
