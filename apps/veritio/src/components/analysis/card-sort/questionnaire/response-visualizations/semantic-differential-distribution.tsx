'use client'

import React, { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { castJson } from '@/lib/supabase/json-utils'
import type {
  SemanticDifferentialQuestionConfig,
  SemanticDifferentialResponseValue,
} from '@veritio/study-types/study-flow-types'
import { useTableSort } from './use-table-sort'

interface SemanticDifferentialDistributionProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface ScaleDistribution {
  scaleId: string
  leftLabel: string
  rightLabel: string
  points: Array<{
    value: number
    label: string
    count: number
    percentage: number
  }>
  mean: number
  totalResponses: number
}

export const SemanticDifferentialDistribution = React.memo(function SemanticDifferentialDistribution({
  question,
  responses,
}: SemanticDifferentialDistributionProps) {
  const { handleSort, getSortIcon, sortItems } = useTableSort<'point' | 'count' | 'percentage'>()

  const config = castJson<SemanticDifferentialQuestionConfig>(
    question.config,
    { scalePoints: 7, scales: [] }
  )

  const scalePoints = config.scalePoints ?? 7
  const maxValue = Math.floor(scalePoints / 2)
  const scaleValues = Array.from({ length: scalePoints }, (_, i) => i - maxValue)

  const distributions = useMemo(() => {
    const results: ScaleDistribution[] = []

    for (const scale of config.scales || []) {
      const counts = new Map<number, number>()
      for (const value of scaleValues) {
        counts.set(value, 0)
      }

      let totalResponses = 0
      let sum = 0

      for (const response of responses) {
        const value = (response.response_value as SemanticDifferentialResponseValue)?.[scale.id]

        if (
          value !== undefined &&
          value !== null &&
          typeof value === 'number' &&
          value >= -maxValue &&
          value <= maxValue
        ) {
          counts.set(value, (counts.get(value) || 0) + 1)
          totalResponses++
          sum += value
        }
      }

      const mean = totalResponses > 0 ? sum / totalResponses : 0

      const points = scaleValues.map((value) => {
        const count = counts.get(value) || 0
        const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0

        return {
          value,
          label: value === 0 ? '0 (Neutral)' : `${value > 0 ? '+' : ''}${value}`,
          count,
          percentage,
        }
      })

      results.push({
        scaleId: scale.id,
        leftLabel: scale.leftLabel || 'Left',
        rightLabel: scale.rightLabel || 'Right',
        points,
        mean,
        totalResponses,
      })
    }

    return results
  }, [config.scales, responses, maxValue, scaleValues])

  const sortPoints = (points: ScaleDistribution['points']) =>
    sortItems(points, (a, b, field) => {
      switch (field) {
        case 'point': return a.value - b.value
        case 'count': return a.count - b.count
        case 'percentage': return a.percentage - b.percentage
      }
    })

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

      <div className="space-y-6">
        {distributions.map((dist) => (
          <div key={dist.scaleId} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{dist.leftLabel}</span>
                <span className="text-muted-foreground/50">↔</span>
                <span className="text-foreground font-medium">{dist.rightLabel}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Mean: <span className="font-semibold text-foreground">{dist.mean.toFixed(2)}</span>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead sortable={false} className="w-32">
                    <button
                      onClick={() => handleSort('point')}
                      className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                      Point
                      {getSortIcon('point')}
                    </button>
                  </TableHead>
                  <TableHead sortable={false} className="text-right">
                    <button
                      onClick={() => handleSort('count')}
                      className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
                    >
                      Count
                      {getSortIcon('count')}
                    </button>
                  </TableHead>
                  <TableHead sortable={false} className="text-right">
                    <button
                      onClick={() => handleSort('percentage')}
                      className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
                    >
                      %
                      {getSortIcon('percentage')}
                    </button>
                  </TableHead>
                  <TableHead sortable={false} className="w-64">Distribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortPoints(dist.points).map((point) => (
                  <TableRow key={point.value}>
                    <TableCell className="font-medium text-xs">
                      {point.label}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {point.count}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {point.percentage.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Progress value={point.percentage} className="h-2" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="text-xs text-muted-foreground text-right">
              {dist.totalResponses} of {responses.length} participants responded to this scale
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
