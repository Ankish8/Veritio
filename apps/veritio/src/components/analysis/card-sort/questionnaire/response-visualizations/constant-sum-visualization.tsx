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
import type { ConstantSumResponseValue } from '@veritio/study-types/study-flow-types'
import { useTableSort } from './use-table-sort'
import { parseConstantSumConfig } from './constant-sum-utils'
import { calculateDescriptiveStats } from './descriptive-stats'

interface ConstantSumVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface ItemStatistics {
  itemId: string
  label: string
  description?: string
  meanAllocation: number
  medianAllocation: number
  stdDev: number
  percentage: number
  minAllocation: number
  maxAllocation: number
  zeroCount: number
}

export const ConstantSumVisualization = React.memo(function ConstantSumVisualization({
  question,
  responses,
}: ConstantSumVisualizationProps) {
  const { handleSort, getSortIcon, sortItems } = useTableSort<'item' | 'mean' | 'percentage'>({
    defaultField: 'mean',
    defaultDirection: 'desc',
  })

  const { items, totalPoints } = parseConstantSumConfig(question)

  const itemStats = useMemo(() => {
    const stats: ItemStatistics[] = []

    for (const item of items) {
      const allocations: number[] = []

      for (const response of responses) {
        const value = response.response_value as ConstantSumResponseValue
        // Try direct ID match first, then label match for legacy data
        const allocation = value?.[item.id] ?? value?.[item.label] ?? 0
        allocations.push(typeof allocation === 'number' ? allocation : 0)
      }

      const desc = calculateDescriptiveStats(allocations)
      const percentage = totalPoints > 0 && desc ? (desc.mean / totalPoints) * 100 : 0

      stats.push({
        itemId: item.id,
        label: item.label || 'Untitled item',
        description: item.description,
        meanAllocation: desc?.mean ?? 0,
        medianAllocation: desc?.median ?? 0,
        stdDev: desc?.stdDev ?? 0,
        percentage,
        minAllocation: desc?.min ?? 0,
        maxAllocation: desc?.max ?? 0,
        zeroCount: allocations.filter(v => v === 0).length,
      })
    }

    return stats
  }, [items, responses, totalPoints])

  const sortedItemStats = sortItems(itemStats, (a, b, field) => {
    switch (field) {
      case 'item': return a.label.localeCompare(b.label)
      case 'mean': return a.meanAllocation - b.meanAllocation
      case 'percentage': return a.percentage - b.percentage
    }
  })

  const validationStats = useMemo(() => {
    let totalPointsUsed = 0
    let completeResponses = 0
    let incompleteResponses = 0

    for (const response of responses) {
      const value = response.response_value as ConstantSumResponseValue
      const sum = Object.values(value || {}).reduce((s, v) => s + (v || 0), 0)

      totalPointsUsed += sum

      if (sum === totalPoints) {
        completeResponses++
      } else {
        incompleteResponses++
      }
    }

    const avgPointsUsed = responses.length > 0
      ? totalPointsUsed / responses.length
      : 0

    return {
      avgPointsUsed,
      completeResponses,
      incompleteResponses,
    }
  }, [responses, totalPoints])

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No responses yet</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Invalid question configuration</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {responses.length} responses · {totalPoints} total points{' '}
          {validationStats.incompleteResponses > 0 && (
            <span className="text-yellow-600 dark:text-yellow-400">
              ({validationStats.avgPointsUsed.toFixed(1)} avg used)
            </span>
          )}
        </span>
      </div>

      <div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead sortable={false} className="w-8">#</TableHead>
              <TableHead sortable={false}>
                <button
                  onClick={() => handleSort('item')}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  Item
                  {getSortIcon('item')}
                </button>
              </TableHead>
              <TableHead sortable={false} className="text-right">
                <button
                  onClick={() => handleSort('mean')}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
                >
                  Mean
                  {getSortIcon('mean')}
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
              <TableHead sortable={false} className="w-40">Allocation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItemStats.map((stat, index) => (
              <TableRow key={stat.itemId}>
                <TableCell className="text-muted-foreground font-medium">
                  {index + 1}
                </TableCell>

                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-medium">{stat.label}</p>
                    {stat.description && (
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-right font-semibold">
                  {stat.meanAllocation.toFixed(1)}
                  <span className="text-xs text-muted-foreground ml-1">pts</span>
                </TableCell>

                <TableCell className="text-right text-sm">
                  {stat.percentage.toFixed(1)}%
                </TableCell>

                <TableCell>
                  <Progress value={stat.percentage} className="h-2" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
})
