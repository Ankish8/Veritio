'use client'

import { useMemo, memo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { RankingQuestionConfig } from '@veritio/study-types/study-flow-types'
import { castJson } from '@/lib/supabase/json-utils'
import { useTableSort } from './use-table-sort'

interface RankingTableViewProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface RankingResponse {
  rankings: Record<string, number>
}

interface ItemStats {
  id: string
  label: string
  avgRank: number
  responseCount: number
  rank1Count: number
  lastRankCount: number
}

/**
 * Simple table visualization for ranking questions.
 * Shows items sorted by average rank with minimal detail.
 */
export const RankingTableView = memo(function RankingTableView({
  question,
  responses,
}: RankingTableViewProps) {
  const { sortField, sortDirection, handleSort, getSortIcon } = useTableSort<'item' | 'avgRank' | 'responses' | 'firstPlace'>()
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

  const tableData = useMemo(() => {
    const itemStats: Record<string, ItemStats> = {}
    const totalItems = items.length

    // Build label→id lookup for handling legacy responses stored as label strings
    const labelToId = new Map<string, string>()
    for (const item of items) {
      itemStats[item.id] = {
        id: item.id,
        label: item.label,
        avgRank: 0,
        responseCount: 0,
        rank1Count: 0,
        lastRankCount: 0,
      }
      labelToId.set(item.label.toLowerCase(), item.id)
    }

    // Aggregate rankings
    for (const response of responses) {
      const value = response.response_value

      // Handle correct format: string[] (ordered array of item IDs)
      if (Array.isArray(value)) {
        (value as string[]).forEach((entry, index) => {
          const itemId = itemStats[entry] ? entry : labelToId.get(String(entry).toLowerCase()) || null
          if (itemId && itemStats[itemId]) {
            const rank = index + 1
            const stats = itemStats[itemId]
            stats.avgRank += rank
            stats.responseCount++
            if (rank === 1) stats.rank1Count++
            if (rank === totalItems) stats.lastRankCount++
          }
        })
        continue
      }

      // Handle legacy format: { rankings: { [itemId]: rank } }
      if (typeof value === 'object' && value !== null && 'rankings' in value) {
        const rankings = (value as unknown as RankingResponse).rankings
        if (!rankings) continue
        for (const [itemId, rank] of Object.entries(rankings)) {
          if (!itemStats[itemId]) continue
          const stats = itemStats[itemId]
          stats.avgRank += rank
          stats.responseCount++
          if (rank === 1) stats.rank1Count++
          if (rank === totalItems) stats.lastRankCount++
        }
      }
    }

    // Calculate averages
    const result: ItemStats[] = []
    for (const item of items) {
      const stats = itemStats[item.id]
      if (stats.responseCount > 0) {
        stats.avgRank = stats.avgRank / stats.responseCount
      }
      result.push(stats)
    }

    return result
  }, [responses, items])

  const sortedData = useMemo(() => {
    // Default sort by average rank (lowest = best) when no custom sort is applied
    if (!sortField) {
      return [...tableData].sort((a, b) => {
        if (a.responseCount === 0 && b.responseCount === 0) return 0
        if (a.responseCount === 0) return 1
        if (b.responseCount === 0) return -1
        return a.avgRank - b.avgRank
      })
    }

    return [...tableData].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'item':
          comparison = a.label.localeCompare(b.label)
          break
        case 'avgRank':
          if (a.responseCount === 0 && b.responseCount === 0) return 0
          if (a.responseCount === 0) return sortDirection === 'asc' ? 1 : -1
          if (b.responseCount === 0) return sortDirection === 'asc' ? -1 : 1
          comparison = a.avgRank - b.avgRank
          break
        case 'responses':
          comparison = a.responseCount - b.responseCount
          break
        case 'firstPlace':
          comparison = a.rank1Count - b.rank1Count
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [tableData, sortField, sortDirection])

  if (items.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">No items configured for ranking</p>
      </div>
    )
  }

  if (responses.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">No responses yet</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead sortable={false} className="w-[60px] text-center">#</TableHead>
          <TableHead sortable={false}>
            <button
              onClick={() => handleSort('item')}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              Item
              {getSortIcon('item')}
            </button>
          </TableHead>
          <TableHead sortable={false} className="w-[120px] text-right">
            <button
              onClick={() => handleSort('avgRank')}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
            >
              Avg. Rank
              {getSortIcon('avgRank')}
            </button>
          </TableHead>
          <TableHead sortable={false} className="w-[100px] text-right">
            <button
              onClick={() => handleSort('responses')}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
            >
              Responses
              {getSortIcon('responses')}
            </button>
          </TableHead>
          <TableHead sortable={false} className="w-[100px] text-right">
            <button
              onClick={() => handleSort('firstPlace')}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
            >
              1st Place
              {getSortIcon('firstPlace')}
            </button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((item, index) => (
          <TableRow key={item.id}>
            <TableCell className="text-center">
              <span className={
                index === 0 ? 'text-green-600 font-semibold' :
                index === 1 ? 'text-blue-600 font-medium' :
                index === 2 ? 'text-amber-600 font-medium' :
                'text-muted-foreground'
              }>
                {index + 1}
              </span>
            </TableCell>
            <TableCell className="font-medium">{item.label}</TableCell>
            <TableCell className="text-right">
              {item.responseCount > 0 ? item.avgRank.toFixed(2) : '—'}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {item.responseCount}
            </TableCell>
            <TableCell className="text-right">
              {item.rank1Count > 0 ? (
                <span className="text-green-600 font-medium">
                  {item.rank1Count}
                </span>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
})
