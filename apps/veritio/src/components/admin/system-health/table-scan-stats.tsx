'use client'

import { Activity, Info } from 'lucide-react'

interface TableScanStatsProps {
  stats: Array<{
    table_name: string
    seq_scan_count: number
    idx_scan_count: number
    ratio: number | null
  }>
}

function getRatioColor(ratio: number | null): string {
  if (ratio === null || ratio === 0) return 'text-emerald-600'
  if (ratio >= 2) return 'text-red-600'
  if (ratio >= 1) return 'text-amber-600'
  return 'text-yellow-600'
}

function getRatioBadge(ratio: number | null): string {
  if (ratio === null || ratio === 0) return 'OPTIMAL'
  if (ratio >= 2) return 'CRITICAL'
  if (ratio >= 1) return 'WARNING'
  return 'REVIEW'
}

function getRatioBadgeColor(ratio: number | null): string {
  if (ratio === null || ratio === 0) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (ratio >= 2) return 'border-red-200 bg-red-50 text-red-700'
  if (ratio >= 1) return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-yellow-200 bg-yellow-50 text-yellow-700'
}

export function TableScanStats({ stats }: TableScanStatsProps) {
  const sortedStats = [...stats].sort((a, b) => {
    const ratioA = a.ratio ?? 0
    const ratioB = b.ratio ?? 0
    return ratioB - ratioA
  })

  const criticalCount = sortedStats.filter((s) => (s.ratio ?? 0) >= 2).length
  const warningCount = sortedStats.filter((s) => (s.ratio ?? 0) >= 1 && (s.ratio ?? 0) < 2).length

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Table Scan Analysis</h3>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-xs font-semibold text-red-600">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-xs font-semibold text-amber-600">
              {warningCount} warning
            </span>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Table
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Seq Scans
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Index Scans
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Ratio
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedStats.slice(0, 15).map((stat) => (
                <tr key={stat.table_name} className="hover:bg-muted/30 transition-colors group">
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {stat.table_name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <span className="text-sm text-foreground">
                      {stat.seq_scan_count.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <span className="text-sm text-foreground">
                      {stat.idx_scan_count.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <span className={`text-sm font-semibold ${getRatioColor(stat.ratio)}`}>
                      {stat.ratio !== null ? stat.ratio.toFixed(2) : 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold border rounded ${getRatioBadgeColor(stat.ratio)}`}
                    >
                      {getRatioBadge(stat.ratio)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedStats.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No table scan data available</p>
          </div>
        )}
      </div>

      <div className="border bg-muted/30 rounded-lg p-4">
        <div className="flex items-start gap-2 mb-2">
          <Info className="w-4 h-4 text-primary mt-0.5" />
          <p className="text-xs font-medium text-foreground">
            Ratio = Sequential Scans / Index Scans
          </p>
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 ml-6">
          <li><span className="text-emerald-600 font-medium">OPTIMAL</span>: More index scans than sequential (ratio &lt;1)</li>
          <li><span className="text-amber-600 font-medium">WARNING</span>: Comparable sequential/index scans (1-2x)</li>
          <li><span className="text-red-600 font-medium">CRITICAL</span>: Heavy sequential scanning (&gt;2x) - add indexes</li>
        </ul>
      </div>
    </section>
  )
}
