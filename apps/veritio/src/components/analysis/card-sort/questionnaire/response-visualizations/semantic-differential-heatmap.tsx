'use client'

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { castJson } from '@/lib/supabase/json-utils'
import type {
  SemanticDifferentialQuestionConfig,
  SemanticDifferentialResponseValue,
} from '@veritio/study-types/study-flow-types'

interface SemanticDifferentialHeatmapProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface HeatmapCell {
  scaleId: string
  scaleValue: number
  count: number
  percentage: number
}

function getHeatmapBgClass(percentage: number): string {
  if (percentage === 0) return ''
  if (percentage < 10) return 'bg-blue-50/50'
  if (percentage < 20) return 'bg-blue-50'
  if (percentage < 30) return 'bg-blue-100'
  if (percentage < 40) return 'bg-blue-150'
  return 'bg-blue-200'
}

export const SemanticDifferentialHeatmap = React.memo(function SemanticDifferentialHeatmap({
  question,
  responses,
}: SemanticDifferentialHeatmapProps) {
  const config = castJson<SemanticDifferentialQuestionConfig>(
    question.config,
    { scalePoints: 7, scales: [] }
  )

  const scalePoints = config.scalePoints ?? 7
  const maxValue = Math.floor(scalePoints / 2)  // 3 for 7-point
  const scaleValues = Array.from({ length: scalePoints }, (_, i) => i - maxValue)

  const heatmapData = useMemo(() => {
    const matrix = new Map<string, Map<number, number>>()

    for (const scale of config.scales || []) {
      const scaleMap = new Map<number, number>()
      for (const value of scaleValues) {
        scaleMap.set(value, 0)
      }
      matrix.set(scale.id, scaleMap)
    }

    for (const response of responses) {
      const value = response.response_value as SemanticDifferentialResponseValue

      for (const scale of config.scales || []) {
        const scaleValue = value?.[scale.id]

        if (
          scaleValue !== undefined &&
          scaleValue !== null &&
          typeof scaleValue === 'number' &&
          scaleValue >= -maxValue &&
          scaleValue <= maxValue
        ) {
          const scaleMap = matrix.get(scale.id)
          if (scaleMap) {
            scaleMap.set(scaleValue, (scaleMap.get(scaleValue) || 0) + 1)
          }
        }
      }
    }

    const cells: HeatmapCell[] = []
    const totalResponses = responses.length

    for (const scale of config.scales || []) {
      const scaleMap = matrix.get(scale.id)
      if (scaleMap) {
        for (const [scaleValue, count] of scaleMap.entries()) {
          cells.push({
            scaleId: scale.id,
            scaleValue,
            count,
            percentage: totalResponses > 0 ? (count / totalResponses) * 100 : 0,
          })
        }
      }
    }

    return { cells, matrix, totalResponses }
  }, [config.scales, responses, maxValue, scaleValues])

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

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-border bg-muted/50 px-3 py-2 text-left font-medium text-xs">
                  Scale
                </th>
                {scaleValues.map((val) => (
                  <th
                    key={val}
                    className="border border-border bg-muted/50 px-2 py-2 text-center font-medium text-xs min-w-[60px]"
                  >
                    {val > 0 ? '+' : ''}{val}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.scales.map((scale) => {
                const scaleMap = heatmapData.matrix.get(scale.id)

                return (
                  <tr key={scale.id}>
                    <td className="border border-border px-3 py-3 text-xs bg-card">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{scale.leftLabel}</span>
                          <span className="text-muted-foreground/50">↔</span>
                          <span className="text-foreground font-medium">{scale.rightLabel}</span>
                        </div>
                      </div>
                    </td>

                    {scaleValues.map((val) => {
                      const count = scaleMap?.get(val) || 0
                      const percentage = heatmapData.totalResponses > 0
                        ? (count / heatmapData.totalResponses) * 100
                        : 0

                      return (
                        <td
                          key={val}
                          className="border border-border p-0 relative group"
                        >
                          <div
                            className={cn(
                              "w-full h-full px-2 py-3 flex items-center justify-center cursor-default transition-colors",
                              getHeatmapBgClass(percentage)
                            )}
                          >
                            <span className="text-xs font-medium text-foreground">
                              {count}
                            </span>
                          </div>

                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-popover border border-border rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            <p className="text-xs">
                              {count} responses ({percentage.toFixed(1)}%)
                            </p>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-50/50" />
          <span>Low (&lt;10%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-100" />
          <span>Medium (~30%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-200" />
          <span>High (40%+)</span>
        </div>
      </div>
    </div>
  )
})
