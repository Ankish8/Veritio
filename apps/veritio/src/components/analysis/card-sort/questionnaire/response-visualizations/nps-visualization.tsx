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
import { cn } from '@/lib/utils'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { useTableSort } from './use-table-sort'

interface NPSVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface ScaleResponse {
  value: number
}

interface NPSCategory {
  label: string
  range: string
  count: number
  percentage: number
  color: string
  bgColor: string
}

export const NPSVisualization = React.memo(function NPSVisualization({
  question: _question,
  responses,
}: NPSVisualizationProps) {
  const { handleSort, getSortIcon, sortItems } = useTableSort<'score' | 'count' | 'percentage'>()

  const npsData = useMemo(() => {
    const scoreCounts = new Array(11).fill(0)
    let totalResponses = 0

    for (const response of responses) {
      const raw = response.response_value
      // Handle both { value: number } (correct format) and plain number (legacy)
      let score: number | null = null
      if (typeof raw === 'number') {
        score = Math.round(raw)
      } else if (typeof raw === 'object' && raw !== null && 'value' in raw) {
        const objValue = (raw as unknown as ScaleResponse).value
        if (typeof objValue === 'number') score = Math.round(objValue)
      }
      if (score !== null && score >= 0 && score <= 10) {
        scoreCounts[score]++
        totalResponses++
      }
    }

    let detractors = 0
    let passives = 0
    let promoters = 0

    for (let i = 0; i <= 6; i++) detractors += scoreCounts[i]
    for (let i = 7; i <= 8; i++) passives += scoreCounts[i]
    for (let i = 9; i <= 10; i++) promoters += scoreCounts[i]

    const detractorPct = totalResponses > 0 ? Math.round((detractors / totalResponses) * 100) : 0
    const passivePct = totalResponses > 0 ? Math.round((passives / totalResponses) * 100) : 0
    const promoterPct = totalResponses > 0 ? Math.round((promoters / totalResponses) * 100) : 0

    const npsScore = promoterPct - detractorPct

    const scoreDistribution = scoreCounts.map((count, score) => ({
      score,
      count,
      percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
      category: score <= 6 ? 'detractor' : score <= 8 ? 'passive' : 'promoter',
    }))

    const categories: NPSCategory[] = [
      {
        label: 'Detractors',
        range: '0-6',
        count: detractors,
        percentage: detractorPct,
        color: 'text-red-600',
        bgColor: 'bg-red-500',
      },
      {
        label: 'Passives',
        range: '7-8',
        count: passives,
        percentage: passivePct,
        color: 'text-gray-600',
        bgColor: 'bg-gray-400',
      },
      {
        label: 'Promoters',
        range: '9-10',
        count: promoters,
        percentage: promoterPct,
        color: 'text-green-600',
        bgColor: 'bg-green-500',
      },
    ]

    return {
      scoreDistribution,
      categories,
      npsScore,
      totalResponses,
    }
  }, [responses])

  const sortedDistribution = sortItems(npsData.scoreDistribution, (a, b, field) => {
    switch (field) {
      case 'score': return a.score - b.score
      case 'count': return a.count - b.count
      case 'percentage': return a.percentage - b.percentage
    }
  })

  const getScoreIndicatorColor = (category: string) => {
    switch (category) {
      case 'detractor':
        return 'bg-red-500'
      case 'passive':
        return 'bg-gray-400'
      case 'promoter':
        return 'bg-green-500'
      default:
        return 'bg-gray-300'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
        <Table className="min-w-[280px]">
          <TableHeader>
            <TableRow>
              <TableHead sortable={false} className="w-[40px] sm:w-[60px]"></TableHead>
              <TableHead sortable={false} className="w-[50px] sm:w-[80px] text-xs sm:text-sm">
                <button
                  onClick={() => handleSort('score')}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  Score
                  {getSortIcon('score')}
                </button>
              </TableHead>
              <TableHead sortable={false} className="w-[50px] sm:w-[80px] text-right text-xs sm:text-sm">
                <button
                  onClick={() => handleSort('count')}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
                >
                  Count
                  {getSortIcon('count')}
                </button>
              </TableHead>
              <TableHead sortable={false} className="text-right text-xs sm:text-sm">
                <button
                  onClick={() => handleSort('percentage')}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
                >
                  %
                  {getSortIcon('percentage')}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDistribution.map((item) => (
              <TableRow key={item.score}>
                <TableCell>
                  <div
                    className={cn(
                      'w-3 h-3 sm:w-4 sm:h-4 rounded-sm',
                      getScoreIndicatorColor(item.category)
                    )}
                  />
                </TableCell>
                <TableCell className="font-medium text-xs sm:text-sm">{item.score}</TableCell>
                <TableCell className="text-right text-xs sm:text-sm">{item.count}</TableCell>
                <TableCell className="text-right text-xs sm:text-sm">{item.percentage}%</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2">
              <TableCell></TableCell>
              <TableCell className="font-semibold text-xs sm:text-sm">Total</TableCell>
              <TableCell className="text-right font-semibold text-xs sm:text-sm">
                {npsData.totalResponses}
              </TableCell>
              <TableCell className="text-right font-semibold text-xs sm:text-sm">100%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-4">
          {npsData.categories.map((category) => (
            <div key={category.label} className="space-y-1">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full text-white font-semibold text-sm',
                    category.bgColor
                  )}
                >
                  {category.count}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{category.label}</span>
                    <span className={cn('text-sm font-medium', category.color)}>
                      {category.percentage}%
                    </span>
                  </div>
                  <Progress
                    value={category.percentage}
                    className={cn(
                      'h-3',
                      category.label === 'Detractors' && '[&>[data-slot=progress-indicator]]:bg-red-500',
                      category.label === 'Passives' && '[&>[data-slot=progress-indicator]]:bg-gray-400',
                      category.label === 'Promoters' && '[&>[data-slot=progress-indicator]]:bg-green-500'
                    )}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 border rounded-lg p-4 sm:p-6 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 sm:mb-2">Overall Score</div>
          <div className={cn(
            'text-3xl sm:text-4xl lg:text-5xl font-bold mb-1',
            npsData.npsScore >= 50 ? 'text-green-600' :
            npsData.npsScore >= 0 ? 'text-amber-600' : 'text-red-600'
          )}>
            {npsData.npsScore > 0 ? '+' : ''}{npsData.npsScore}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">NPS Score</div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <span className="bg-muted text-foreground px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-medium">NPS</span>
          <span className="text-muted-foreground">=</span>
          <span className="bg-green-100 text-green-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-medium">Promoters</span>
          <span className="text-muted-foreground">−</span>
          <span className="bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-medium">Detractors</span>
        </div>
      </div>
    </div>
  )
})
