'use client'

import { memo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CrossTabCell } from './cross-tab-cell'
import type { CrossTabData, CrossTabDisplayOptions, CrossTabCell as CellType } from './types'

interface CrossTabTableProps {
  data: CrossTabData
  displayOptions: CrossTabDisplayOptions
}

// Truncate text with ellipsis
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

// Header cell with tooltip for full text
function HeaderCell({
  text,
  maxLength = 25,
  className,
  align = 'left',
}: {
  text: string
  maxLength?: number
  className?: string
  align?: 'left' | 'center'
}) {
  const isTruncated = text.length > maxLength
  const displayText = truncateText(text, maxLength)

  if (!isTruncated) {
    return (
      <div className={`${align === 'center' ? 'text-center' : 'text-left'} ${className || ''}`}>
        {text}
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`truncate cursor-help ${align === 'center' ? 'text-center' : 'text-left'} ${className || ''}`}>
          {displayText}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{text}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export const CrossTabTable = memo(function CrossTabTable({ data, displayOptions }: CrossTabTableProps) {
  const { rowLabels, colLabels, cells, rowTotals, colTotals, grandTotal } = data

  // Create a "total" cell for display
  const createTotalCell = (count: number, rowTotal: number, colTotal: number): CellType => ({
    count,
    rowPercent: rowTotal > 0 ? (count / rowTotal) * 100 : 0,
    colPercent: colTotal > 0 ? (count / colTotal) * 100 : 0,
    totalPercent: grandTotal > 0 ? (count / grandTotal) * 100 : 0,
    expected: 0,
    residual: 0,
  })

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="bg-muted/50">
              {/* Corner cell with row question text */}
              <th className="px-3 py-2 text-left font-medium border-r border-b w-[180px]">
                <HeaderCell text={data.rowQuestionText} maxLength={30} />
              </th>
              {/* Column headers */}
              {colLabels.map((label, idx) => (
                <th
                  key={idx}
                  className="px-3 py-2 text-center font-medium border-r border-b last:border-r-0"
                  style={{ minWidth: displayOptions.minCellWidth }}
                >
                  <HeaderCell text={label} maxLength={20} align="center" />
                </th>
              ))}
              {/* Total column header */}
              <th className="px-3 py-2 text-center font-medium border-b bg-muted/30 w-[80px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Data rows */}
            {rowLabels.map((rowLabel, rowIdx) => (
              <tr key={rowIdx} className="border-b last:border-b-0 hover:bg-muted/20">
                {/* Row header */}
                <th className="px-3 py-2 text-left font-medium border-r bg-muted/30">
                  <HeaderCell text={rowLabel} maxLength={25} />
                </th>
                {/* Data cells */}
                {cells[rowIdx].map((cell, colIdx) => (
                  <CrossTabCell
                    key={colIdx}
                    cell={cell}
                    displayOptions={displayOptions}
                  />
                ))}
                {/* Row total */}
                <CrossTabCell
                  cell={createTotalCell(rowTotals[rowIdx], rowTotals[rowIdx], grandTotal)}
                  displayOptions={displayOptions}
                  isTotal
                />
              </tr>
            ))}
            {/* Total row */}
            <tr className="bg-muted/30 font-medium">
              <th className="px-3 py-2 text-left border-r">Total</th>
              {colTotals.map((total, idx) => (
                <CrossTabCell
                  key={idx}
                  cell={createTotalCell(total, grandTotal, total)}
                  displayOptions={displayOptions}
                  isTotal
                />
              ))}
              <td className="px-3 py-2 text-center font-bold border-l">
                {grandTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  )
})
