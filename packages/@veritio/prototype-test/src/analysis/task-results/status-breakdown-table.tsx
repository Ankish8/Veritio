'use client'

import { cn } from '@veritio/ui'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import type { PrototypeStatusBreakdown } from '@veritio/prototype-test/algorithms/prototype-test-analysis'

interface StatusBreakdownTableProps {
  statusBreakdown: PrototypeStatusBreakdown
  responseCount: number
  className?: string
}

// Flat colors
const STATUS_COLORS = {
  success: '#22c55e',
  failure: '#ef4444',
  skipped: '#94a3b8',
}

// Tooltips explaining each outcome
const STATUS_TOOLTIPS = {
  success: 'Participant reached the target screen (destination mode) or followed the correct path (pathway mode)',
  failure: 'Participant clicked "I\'m stuck" or "Mark complete" without reaching the goal',
  skipped: 'Participant chose to skip the task without attempting it',
}
export function StatusBreakdownTable({
  statusBreakdown,
  responseCount,
  className,
}: StatusBreakdownTableProps) {
  const calculatePercentage = (count: number) => {
    if (responseCount === 0) return 0
    return Math.round((count / responseCount) * 100)
  }

  const rows = [
    { key: 'success' as const, label: 'Success', direct: statusBreakdown.success.direct, indirect: statusBreakdown.success.indirect, total: statusBreakdown.success.total },
    { key: 'failure' as const, label: 'Failure', direct: statusBreakdown.failure.direct, indirect: statusBreakdown.failure.indirect, total: statusBreakdown.failure.total },
    { key: 'skipped' as const, label: 'Skipped', direct: statusBreakdown.skipped.direct, indirect: statusBreakdown.skipped.indirect, total: statusBreakdown.skipped.total },
  ]

  return (
    <TooltipProvider>
    <div className={className}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2.5 pr-4 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">Result</th>
            <th className="py-2.5 px-2 text-center font-medium text-xs uppercase tracking-wide text-muted-foreground">Direct</th>
            <th className="py-2.5 px-2 text-center font-medium text-xs uppercase tracking-wide text-muted-foreground">Indirect</th>
            <th className="py-2.5 px-2 text-center font-medium text-xs uppercase tracking-wide text-muted-foreground">Total</th>
            <th className="py-2.5 pl-2 text-right font-medium text-xs uppercase tracking-wide text-muted-foreground">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const color = STATUS_COLORS[row.key]
            const isLast = idx === rows.length - 1
            const hasData = row.total > 0

            return (
              <tr
                key={row.label}
                className={cn(
                  'transition-colors hover:bg-muted/30',
                  !isLast && 'border-b border-muted'
                )}
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                    <span className={cn('font-medium', !hasData && 'text-muted-foreground')}>{row.label}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px]">
                        <p className="text-xs">{STATUS_TOOLTIPS[row.key]}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  {row.direct > 0 ? (
                    <span className="text-green-600 font-medium">{row.direct}</span>
                  ) : (
                    <span className="text-muted-foreground/50">–</span>
                  )}
                </td>
                <td className="py-3 px-2 text-center">
                  {row.indirect > 0 ? (
                    <span className="text-violet-600 font-medium">{row.indirect}</span>
                  ) : (
                    <span className="text-muted-foreground/50">–</span>
                  )}
                </td>
                <td className="py-3 px-2 text-center">
                  <span className={cn('font-semibold', !hasData && 'text-muted-foreground/50')}>
                    {hasData ? row.total : '–'}
                  </span>
                </td>
                <td className="py-3 pl-2 text-right">
                  <span className={cn('font-semibold tabular-nums', !hasData && 'text-muted-foreground/50')}>
                    {hasData ? `${calculatePercentage(row.total)}%` : '–'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    </TooltipProvider>
  )
}
