'use client'

import { ArrowRight, Check, X } from 'lucide-react'
import type { PathFrequency } from '@/lib/algorithms/tree-test-analysis'
import { cn } from '@/lib/utils'

interface ComparisonPathsTableProps {
  paths: PathFrequency[]
  className?: string
}

/**
 * Table showing unique paths taken by participants with success/fail indicators.
 * Matches the Optimal Workshop paths comparison design.
 */
export function ComparisonPathsTable({ paths, className }: ComparisonPathsTableProps) {
  if (paths.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No path data available
      </div>
    )
  }

  // Calculate totals
  const totalPaths = paths.length
  const successfulPaths = paths.filter(p => p.isSuccessPath).length
  const unsuccessfulPaths = totalPaths - successfulPaths

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <ArrowRight className="h-4 w-4" />
          </div>
          <div>
            <div className="text-muted-foreground">Total unique paths</div>
            <div className="font-semibold">{totalPaths}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <div className="text-muted-foreground">Successful paths</div>
            <div className="font-semibold">{successfulPaths}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <X className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <div className="text-muted-foreground">Unsuccessful paths</div>
            <div className="font-semibold">{unsuccessfulPaths}</div>
          </div>
        </div>
      </div>

      {/* Paths table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-16 z-10">
            <tr className="bg-muted/50 border-b">
              <th className="text-left p-3 font-medium bg-muted/50">Path</th>
              <th className="text-right p-3 font-medium w-28 bg-muted/50">Participants</th>
            </tr>
          </thead>
          <tbody>
            {paths.map((path, index) => (
              <tr
                key={index}
                className={cn(
                  'border-b last:border-b-0',
                  path.isSuccessPath ? 'bg-green-50/50' : 'bg-red-50/50'
                )}
              >
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <ArrowRight
                      className={cn(
                        'h-4 w-4 shrink-0',
                        path.isSuccessPath ? 'text-green-600' : 'text-red-600'
                      )}
                    />
                    <span className="text-muted-foreground">
                      {path.pathLabels.join(' > ')}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-right">
                  <span className="font-medium">{path.count}</span>
                  <span className="text-muted-foreground ml-2">
                    {path.percentage.toFixed(0)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
