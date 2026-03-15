'use client'

import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { CrossTabCell as CrossTabCellType, CrossTabDisplayOptions } from './types'
import { getResidualColorClass } from './types'

interface CrossTabCellProps {
  cell: CrossTabCellType
  displayOptions: CrossTabDisplayOptions
  isTotal?: boolean
}

export function CrossTabCell({
  cell,
  displayOptions,
  isTotal = false,
}: CrossTabCellProps) {
  const { showRowPercent, showColPercent, showExpected, highlightSignificant } = displayOptions

  const bgColorClass = highlightSignificant && !isTotal
    ? getResidualColorClass(cell.residual)
    : ''

  const formatPercent = (value: number) => `${value.toFixed(1)}%`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <td
          className={cn(
            'px-3 py-2 text-center border-r last:border-r-0 transition-colors',
            bgColorClass,
            isTotal && 'font-medium bg-muted/30',
          )}
        >
          <div className="space-y-0.5">
            <div className="font-medium">{cell.count}</div>
            {showRowPercent && !isTotal && (
              <div className="text-xs text-muted-foreground">
                {formatPercent(cell.rowPercent)}
              </div>
            )}
            {showColPercent && !isTotal && (
              <div className="text-xs text-muted-foreground">
                {formatPercent(cell.colPercent)}
              </div>
            )}
          </div>
        </td>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1 text-xs">
          <div><strong>Count:</strong> {cell.count}</div>
          <div><strong>Row %:</strong> {formatPercent(cell.rowPercent)}</div>
          <div><strong>Column %:</strong> {formatPercent(cell.colPercent)}</div>
          <div><strong>Total %:</strong> {formatPercent(cell.totalPercent)}</div>
          {showExpected && (
            <div><strong>Expected:</strong> {cell.expected.toFixed(1)}</div>
          )}
          <div>
            <strong>Residual:</strong> {cell.residual.toFixed(2)}
            {Math.abs(cell.residual) >= 2 && (
              <span className="ml-1 text-amber-600">(significant)</span>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
