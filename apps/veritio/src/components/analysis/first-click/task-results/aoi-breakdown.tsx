'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { TaskMetric } from '@/services/results/first-click'

interface AoiBreakdownProps {
  metric: TaskMetric
  className?: string
}

export function AoiBreakdown({ metric, className }: AoiBreakdownProps) {
  const rows = useMemo(() => {
    const nonSkippedCount = metric.responseCount - metric.skipCount
    if (nonSkippedCount <= 0) return []

    const aoiRows = metric.aoiHits.map((aoi) => ({
      name: aoi.aoiName,
      count: aoi.hitCount,
      percent: (aoi.hitCount / nonSkippedCount) * 100,
    }))

    // Add "(Outside AOIs)" row for misses
    const totalAoiHits = metric.aoiHits.reduce((sum, a) => sum + a.hitCount, 0)
    const outsideCount = nonSkippedCount - totalAoiHits
    if (outsideCount > 0) {
      aoiRows.push({
        name: '(Outside AOIs)',
        count: outsideCount,
        percent: (outsideCount / nonSkippedCount) * 100,
      })
    }

    return aoiRows.sort((a, b) => b.count - a.count)
  }, [metric])

  // Only render when task has defined AOIs with at least one hit
  if (metric.aoiHits.length === 0 || rows.length === 0) {
    return null
  }

  const maxCount = Math.max(...rows.map((r) => r.count))

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">AOI Click Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">
          How clicks distributed across defined areas of interest
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate flex-1 mr-4 font-medium">
                  {row.name}
                </span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {row.count} ({Math.round(row.percent)}%)
                </span>
              </div>
              <Progress
                value={maxCount > 0 ? (row.count / maxCount) * 100 : 0}
                className="h-2"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
