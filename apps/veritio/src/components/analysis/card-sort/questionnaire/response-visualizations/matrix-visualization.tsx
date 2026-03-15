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
import { cn } from '@/lib/utils'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { castJson } from '@/lib/supabase/json-utils'
import type { MatrixQuestionConfig } from '@veritio/study-types/study-flow-types'
import { countMatrixResponses, normalizeMatrixItems } from './matrix-utils'
import { useTableSort } from './use-table-sort'

interface MatrixVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface CellData {
  count: number
  percentage: number
}

export const MatrixVisualization = React.memo(function MatrixVisualization({
  question,
  responses,
}: MatrixVisualizationProps) {
  const { handleSort, getSortIcon, sortItems } = useTableSort<'question'>()
  const config = castJson<MatrixQuestionConfig>(question.config, { rows: [], columns: [] })
  const rows = normalizeMatrixItems(config?.rows || [])
  const columns = normalizeMatrixItems(config?.columns || [])

  const matrixData = useMemo(() => {
    const { cellCounts, rowCounts } = countMatrixResponses(responses, rows, columns)

    let maxCount = 1
    const cells: Record<string, Record<string, CellData>> = {}

    for (const row of rows) {
      cells[row.id] = {}
      const rowTotal = rowCounts[row.id] || 1

      for (const col of columns) {
        const count = cellCounts[row.id][col.id]
        maxCount = Math.max(maxCount, count)
        cells[row.id][col.id] = {
          count,
          percentage: rowTotal > 0 ? Math.round((count / rowTotal) * 100) : 0,
        }
      }
    }

    return { cells, maxCount, rowCounts }
  }, [responses, rows, columns])

  const sortedRows = sortItems(rows, (a, b) => a.label.localeCompare(b.label))

  if (rows.length === 0 || columns.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">No matrix configuration found</p>
      </div>
    )
  }

  const getCellBgClass = (count: number): string => {
    if (count === 0) return ''
    const intensity = count / matrixData.maxCount
    if (intensity >= 0.8) return 'bg-blue-200'
    if (intensity >= 0.6) return 'bg-blue-150'
    if (intensity >= 0.4) return 'bg-blue-100'
    if (intensity >= 0.2) return 'bg-blue-50'
    return 'bg-blue-50/50'
  }

  return (
    <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
      <Table className="min-w-[400px]">
        <TableHeader>
          <TableRow>
            <TableHead sortable={false} className="min-w-[100px] sm:min-w-[150px] text-xs sm:text-sm">
              <button
                onClick={() => handleSort('question')}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                Question
                {getSortIcon('question')}
              </button>
            </TableHead>
            {columns.map((col) => (
              <TableHead sortable={false} key={col.id} className="text-center min-w-[70px] sm:min-w-[100px] text-xs sm:text-sm">
                <span className="line-clamp-2">{col.label}</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium text-xs sm:text-sm">{row.label}</TableCell>
              {columns.map((col) => {
                const cellData = matrixData.cells[row.id]?.[col.id]
                return (
                  <TableCell
                    key={col.id}
                    className={cn(
                      'text-center p-1.5 sm:p-2',
                      getCellBgClass(cellData?.count || 0)
                    )}
                  >
                    <div className="font-medium text-xs sm:text-sm">{cellData?.count || 0}</div>
                    <div className="text-[12px] sm:text-xs text-muted-foreground">
                      {cellData?.percentage || 0}%
                    </div>
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
})
