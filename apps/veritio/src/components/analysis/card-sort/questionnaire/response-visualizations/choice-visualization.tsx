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
import type { QuestionType } from '@veritio/study-types/study-flow-types'
import { extractChoiceConfig, countChoiceResponses } from './choice-utils'
import { useTableSort } from './use-table-sort'

interface ChoiceVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
  questionType: QuestionType
}

interface OptionStats {
  id: string
  label: string
  frequency: number
  percentage: number
}

export const ChoiceVisualization = React.memo(function ChoiceVisualization({
  question,
  responses,
  questionType,
}: ChoiceVisualizationProps) {
  const { handleSort, getSortIcon, sortItems } = useTableSort<'answer' | 'count' | 'percentage'>()

  const isYesNo = questionType === 'yes_no'

  const config = useMemo(
    () => extractChoiceConfig(question, questionType),
    [question, questionType]
  )

  const optionStats = useMemo(() => {
    const { counts, otherCount } = countChoiceResponses(responses, config, isYesNo)
    const totalResponses = responses.length

    const stats: OptionStats[] = config.options.map(opt => ({
      id: opt.id,
      label: opt.label,
      frequency: counts.get(opt.id) || 0,
      percentage: totalResponses > 0
        ? Math.round(((counts.get(opt.id) || 0) / totalResponses) * 100)
        : 0,
    }))

    if (config.allowOther && otherCount > 0) {
      stats.push({
        id: '__other__',
        label: config.otherLabel,
        frequency: otherCount,
        percentage: totalResponses > 0
          ? Math.round((otherCount / totalResponses) * 100)
          : 0,
      })
    }

    return { stats, totalResponses }
  }, [responses, config, isYesNo])

  const sortedStats = sortItems(optionStats.stats, (a, b, field) => {
    switch (field) {
      case 'answer': return a.label.localeCompare(b.label)
      case 'count': return a.frequency - b.frequency
      case 'percentage': return a.percentage - b.percentage
    }
  })

  if (config.options.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">No options configured for this question</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
      <Table className="min-w-[400px]">
        <TableHeader>
          <TableRow>
            <TableHead sortable={false} className="w-[35%] sm:w-[40%] text-xs sm:text-sm">
              <button
                onClick={() => handleSort('answer')}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                Answer
                {getSortIcon('answer')}
              </button>
            </TableHead>
            <TableHead sortable={false} className="w-[70px] sm:w-[100px] text-right text-xs sm:text-sm">
              <button
                onClick={() => handleSort('count')}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto"
              >
                Count
                {getSortIcon('count')}
              </button>
            </TableHead>
            <TableHead sortable={false} className="w-[60px] sm:w-[100px] text-right text-xs sm:text-sm">
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
          {sortedStats.map((stat) => (
            <TableRow key={stat.id}>
              <TableCell className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{stat.label}</TableCell>
              <TableCell className="text-right text-xs sm:text-sm">{stat.frequency}</TableCell>
              <TableCell className="text-right text-xs sm:text-sm">{stat.percentage}%</TableCell>
              <TableCell>
                <Progress
                  value={stat.percentage}
                  className="h-3 sm:h-4 [&>[data-slot=progress-indicator]]:bg-green-500"
                />
              </TableCell>
            </TableRow>
          ))}
          {sortedStats.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground text-xs sm:text-sm">
                No responses yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
})
