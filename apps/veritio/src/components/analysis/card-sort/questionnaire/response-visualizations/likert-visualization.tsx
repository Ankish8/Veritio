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
import type { OpinionScaleQuestionConfig } from '@veritio/study-types/study-flow-types'
import { useTableSort } from './use-table-sort'

interface LikertVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface ScaleResponse {
  value: number
}

export const LikertVisualization = React.memo(function LikertVisualization({
  question,
  responses,
}: LikertVisualizationProps) {
  const { handleSort, getSortIcon, sortItems } = useTableSort<'scale' | 'count' | 'percentage'>()
  const config = castJson<OpinionScaleQuestionConfig>(question.config, { scalePoints: 5, scaleType: 'numerical' })
  const scalePoints = config?.scalePoints || 5
  const labels = useMemo(() => {
    const result: string[] = []
    if (scalePoints > 0) {
      for (let i = 0; i < scalePoints; i++) {
        if (i === 0 && config?.leftLabel) {
          result.push(config.leftLabel)
        } else if (i === scalePoints - 1 && config?.rightLabel) {
          result.push(config.rightLabel)
        } else if (i === Math.floor(scalePoints / 2) && config?.middleLabel) {
          result.push(config.middleLabel)
        } else {
          result.push('')
        }
      }
    }
    return result
  }, [scalePoints, config?.leftLabel, config?.rightLabel, config?.middleLabel])

  const likertData = useMemo(() => {
    const counts = new Array(scalePoints).fill(0)
    let totalResponses = 0
    let sum = 0

    for (const response of responses) {
      const rawValue = response.response_value
      let scaleValue: number | null = null

      if (typeof rawValue === 'number') {
        scaleValue = rawValue - 1
      } else if (typeof rawValue === 'object' && rawValue !== null) {
        const objValue = rawValue as unknown as ScaleResponse
        if (typeof objValue.value === 'number') {
          scaleValue = objValue.value
        }
      }

      if (scaleValue !== null && scaleValue >= 0 && scaleValue < scalePoints) {
        counts[scaleValue]++
        totalResponses++
        sum += scaleValue + 1
      }
    }

    const average = totalResponses > 0 ? (sum / totalResponses).toFixed(1) : '—'
    const maxCount = Math.max(...counts, 1)

    const distribution = counts.map((count, index) => ({
      scaleValue: index + 1,
      label: labels[index] || `${index + 1}`,
      count,
      percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
    }))

    return {
      distribution,
      totalResponses,
      average,
      maxCount,
    }
  }, [responses, scalePoints, labels])

  const sortedDistribution = sortItems(likertData.distribution, (a, b, field) => {
    switch (field) {
      case 'scale': return a.scaleValue - b.scaleValue
      case 'count': return a.count - b.count
      case 'percentage': return a.percentage - b.percentage
    }
  })

  return (
    <div className="space-y-3 sm:space-y-4">
      {config?.leftLabel && config?.rightLabel && (
        <div className="flex justify-between text-xs sm:text-sm text-muted-foreground px-2">
          <span>{config.leftLabel}</span>
          <span>{config.rightLabel}</span>
        </div>
      )}

      <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
        <Table className="min-w-[400px]">
          <TableHeader>
            <TableRow>
              <TableHead sortable={false} className="w-[50px] sm:w-[60px] text-xs sm:text-sm">
                <button
                  onClick={() => handleSort('scale')}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  Scale
                  {getSortIcon('scale')}
                </button>
              </TableHead>
              <TableHead sortable={false} className="text-xs sm:text-sm">Label</TableHead>
              <TableHead sortable={false} className="w-[60px] sm:w-[80px] text-right text-xs sm:text-sm">
                <button
                  onClick={() => handleSort('count')}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
                >
                  Count
                  {getSortIcon('count')}
                </button>
              </TableHead>
              <TableHead sortable={false} className="w-[70px] sm:w-[100px] text-right text-xs sm:text-sm">
                <button
                  onClick={() => handleSort('percentage')}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
                >
                  %
                  {getSortIcon('percentage')}
                </button>
              </TableHead>
              <TableHead sortable={false} className="w-[30%] sm:w-[40%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDistribution.map((item) => (
              <TableRow key={item.scaleValue}>
                <TableCell className="font-medium text-xs sm:text-sm">{item.scaleValue}</TableCell>
                <TableCell className="text-muted-foreground text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{item.label}</TableCell>
                <TableCell className="text-right text-xs sm:text-sm">{item.count}</TableCell>
                <TableCell className="text-right text-xs sm:text-sm">{item.percentage}%</TableCell>
                <TableCell>
                  <Progress
                    value={item.percentage}
                    className="h-3 sm:h-4 [&>[data-slot=progress-indicator]]:bg-blue-500"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-1.5 sm:gap-2 text-xs sm:text-sm">
        <span className="text-muted-foreground">Avg:</span>
        <span className="font-semibold text-base sm:text-lg">{likertData.average}</span>
        <span className="text-muted-foreground">/ {scalePoints}</span>
      </div>
    </div>
  )
})
