'use client'

/**
 * Response Statistics Card
 *
 * Summary card showing:
 * - Total responses
 * - Response rate
 * - Average response length
 * - Average response time
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FirstImpressionResponse } from '@/services/results/first-impression'

interface ResponseStatsCardProps {
  responses: FirstImpressionResponse[]
  totalExposures: number
}

export function ResponseStatsCard({ responses, totalExposures }: ResponseStatsCardProps) {
  const stats = useMemo(() => {
    // Total responses
    const totalResponses = responses.length

    // Response rate
    const responseRate = totalExposures > 0
      ? (totalResponses / totalExposures) * 100
      : 0

    // Text responses for length calculation
    const textResponses = responses.filter(r => {
      const val = r.response_value
      return typeof val === 'string' && val.trim().length > 0
    })

    // Average length (words)
    const avgWordCount = textResponses.length > 0
      ? textResponses.reduce((sum, r) => {
          const text = typeof r.response_value === 'string' ? r.response_value : ''
          const words = text.trim().split(/\s+/).filter(w => w.length > 0)
          return sum + words.length
        }, 0) / textResponses.length
      : 0

    // Average character count
    const avgCharCount = textResponses.length > 0
      ? textResponses.reduce((sum, r) => {
          const text = typeof r.response_value === 'string' ? r.response_value : ''
          return sum + text.length
        }, 0) / textResponses.length
      : 0

    // Average response time
    const responsesWithTime = responses.filter(r => r.response_time_ms != null)
    const avgResponseTimeMs = responsesWithTime.length > 0
      ? responsesWithTime.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / responsesWithTime.length
      : 0

    return {
      totalResponses,
      responseRate,
      avgWordCount,
      avgCharCount,
      avgResponseTimeMs,
    }
  }, [responses, totalExposures])

  // Format response time
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Response Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-lg font-semibold">{stats.totalResponses}</p>
            <p className="text-xs text-muted-foreground">Total Responses</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{stats.responseRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Response Rate</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{stats.avgWordCount.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Avg. Words</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{formatTime(stats.avgResponseTimeMs)}</p>
            <p className="text-xs text-muted-foreground">Avg. Time</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
