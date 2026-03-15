'use client'

import type { StatusBreakdown } from '@/lib/algorithms/statistics'

interface StatusBreakdownTableProps {
  statusBreakdown: StatusBreakdown
  responseCount: number
  className?: string
}

// Colors matching pie chart
const STATUS_COLORS = {
  success: '#22c55e', // green-500
  fail: '#ef4444',    // red-500
  skip: '#a8a29e',    // stone-400
}

/**
 * Status breakdown table matching Optimal Workshop design.
 * Shows Direct/Indirect stacked vertically in each row.
 */
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
    {
      label: 'Success',
      color: STATUS_COLORS.success,
      direct: statusBreakdown.success.direct,
      indirect: statusBreakdown.success.indirect,
      total: statusBreakdown.success.total,
    },
    {
      label: 'Fail',
      color: STATUS_COLORS.fail,
      direct: statusBreakdown.fail.direct,
      indirect: statusBreakdown.fail.indirect,
      total: statusBreakdown.fail.total,
    },
    {
      label: 'Skip',
      color: STATUS_COLORS.skip,
      direct: statusBreakdown.skip.direct,
      indirect: statusBreakdown.skip.indirect,
      total: statusBreakdown.skip.total,
    },
  ]

  return (
    <div className={className}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-3 pr-4 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</th>
            <th className="py-3 px-2 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground"></th>
            <th className="py-3 px-2 text-center font-semibold text-xs uppercase tracking-wide text-muted-foreground">Count</th>
            <th className="py-3 px-2 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground"></th>
            <th className="py-3 pl-2 text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-muted/50 hover:bg-slate-50/50 transition-colors">
              {/* Color square + Label */}
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded shrink-0"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="font-medium">{row.label}</span>
                </div>
              </td>

              {/* Direct/Indirect stacked */}
              <td className="py-3 px-2">
                <div className="flex flex-col text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-green-600 font-medium">Direct</span>
                    <span className="text-green-600">{row.direct}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-purple-600 font-medium">Indirect</span>
                    <span className="text-purple-600">{row.indirect}</span>
                  </div>
                </div>
              </td>

              {/* Total count */}
              <td className="py-3 px-2 text-center font-medium">
                {row.total}
              </td>

              {/* Direct/Indirect percentages stacked */}
              <td className="py-3 px-2">
                <div className="flex flex-col text-xs">
                  <span className="text-green-600">
                    {calculatePercentage(row.direct)}%
                  </span>
                  <span className="text-purple-600">
                    {calculatePercentage(row.indirect)}%
                  </span>
                </div>
              </td>

              {/* Total percentage */}
              <td className="py-3 pl-2 text-right font-medium">
                {calculatePercentage(row.total)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-muted-foreground mt-3 italic">
        * percentages may not total 100 due to rounding
      </p>
    </div>
  )
}
