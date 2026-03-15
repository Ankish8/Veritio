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
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { castJson } from '@/lib/supabase/json-utils'
import type { RankingQuestionConfig } from '@veritio/study-types/study-flow-types'
import { useTableSort } from './use-table-sort'

interface RankingVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface ItemRankData {
  id: string
  label: string
  avgRank: number
  rankDistribution: number[] // Count per rank position
  totalRanked: number
}

/**
 * Visualization for ranking questions.
 * Shows items sorted by average rank with rank position distribution.
 */
export const RankingVisualization = React.memo(function RankingVisualization({
  question,
  responses,
}: RankingVisualizationProps) {
  const { handleSort, getSortIcon, sortItems } = useTableSort<'item' | 'avgRank'>({
    defaultField: 'avgRank',
  })

  const rawConfig = castJson<RankingQuestionConfig>(question.config, { items: [] })

  // Normalize items: handle both {id, label} objects and plain strings
  const items = useMemo(() => {
    const raw = rawConfig?.items || []
    return raw.map((item: any, index: number) => {
      if (typeof item === 'string') {
        return { id: item, label: item }
      }
      return { id: item.id || `item-${index}`, label: item.label || item.id || `Item ${index + 1}` }
    })
  }, [rawConfig?.items])

  // Calculate ranking stats
  const rankingData = useMemo(() => {
    const itemStats: Record<string, {
      ranks: number[]
      rankCounts: number[]
    }> = {}

    // Build label→id lookup for handling legacy responses stored as label strings
    const labelToId = new Map<string, string>()
    for (const item of items) {
      itemStats[item.id] = {
        ranks: [],
        rankCounts: new Array(items.length).fill(0),
      }
      labelToId.set(item.label.toLowerCase(), item.id)
    }

    // Process responses
    for (const response of responses) {
      const ranking = response.response_value as string[]
      if (!Array.isArray(ranking)) continue

      ranking.forEach((value, index) => {
        // Try direct ID match first, then label match
        const itemId = itemStats[value] ? value : labelToId.get(String(value).toLowerCase()) || null
        if (itemId && itemStats[itemId]) {
          const rank = index + 1 // 1-based rank
          itemStats[itemId].ranks.push(rank)
          if (index < items.length) {
            itemStats[itemId].rankCounts[index]++
          }
        }
      })
    }

    // Calculate average ranks and build output
    const itemRankData: ItemRankData[] = items.map((item) => {
      const stats = itemStats[item.id]
      const totalRanked = stats.ranks.length
      const avgRank = totalRanked > 0
        ? stats.ranks.reduce((a, b) => a + b, 0) / totalRanked
        : items.length + 1 // Put unranked items at the end

      return {
        id: item.id,
        label: item.label,
        avgRank: Math.round(avgRank * 10) / 10,
        rankDistribution: stats.rankCounts,
        totalRanked,
      }
    })

    return {
      items: itemRankData,
      totalItems: items.length,
      totalResponses: responses.length,
    }
  }, [responses, items])

  const sortedRankingItems = sortItems(rankingData.items, (a, b, field) => {
    switch (field) {
      case 'item': return a.label.localeCompare(b.label)
      case 'avgRank': return a.avgRank - b.avgRank
    }
  })

  if (items.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">No ranking items configured</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
        <Table className="min-w-[400px]">
          <TableHeader>
            <TableRow>
              <TableHead sortable={false} className="w-[40px] sm:w-[50px] text-xs sm:text-sm">#</TableHead>
              <TableHead sortable={false} className="text-xs sm:text-sm">
                <button
                  onClick={() => handleSort('item')}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  Item
                  {getSortIcon('item')}
                </button>
              </TableHead>
              <TableHead sortable={false} className="w-[70px] sm:w-[100px] text-right text-xs sm:text-sm">
                <button
                  onClick={() => handleSort('avgRank')}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
                >
                  Avg
                  {getSortIcon('avgRank')}
                </button>
              </TableHead>
              <TableHead sortable={false} className="w-[30%] sm:w-[40%] text-xs sm:text-sm">Distribution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRankingItems.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-muted-foreground text-xs sm:text-sm">
                  {index + 1}
                </TableCell>
                <TableCell className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{item.label}</TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold text-xs sm:text-sm">{item.avgRank.toFixed(1)}</span>
                </TableCell>
                <TableCell>
                  <RankDistributionBar
                    distribution={item.rankDistribution}
                    totalResponses={rankingData.totalResponses}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Legend - responsive wrap */}
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4 text-[12px] sm:text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-sm" />
          <span>Rank 1</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-sm" />
          <span>Rank 2-3</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gray-400 rounded-sm" />
          <span>Lower</span>
        </div>
      </div>
    </div>
  )
})

/**
 * Horizontal stacked bar showing rank position distribution
 */
function RankDistributionBar({
  distribution,
  totalResponses,
}: {
  distribution: number[]
  totalResponses: number
}) {
  if (totalResponses === 0) {
    return <div className="h-4 bg-muted rounded" />
  }

  const getColor = (index: number) => {
    if (index === 0) return 'bg-green-500'
    if (index <= 2) return 'bg-blue-500'
    return 'bg-gray-400'
  }

  return (
    <div className="flex h-4 rounded overflow-hidden bg-muted">
      {distribution.map((count, index) => {
        const percentage = (count / totalResponses) * 100
        if (percentage === 0) return null

        return (
          <div
            key={index}
            className={getColor(index)}
            style={{ width: `${percentage}%` }}
            title={`Rank ${index + 1}: ${count} (${Math.round(percentage)}%)`}
          />
        )
      })}
    </div>
  )
}
