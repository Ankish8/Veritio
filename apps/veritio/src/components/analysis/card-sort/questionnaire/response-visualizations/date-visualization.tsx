'use client'

import { useMemo, Suspense } from 'react'
import {
  LazyAreaChart,
  LazyArea,
  LazyXAxis,
  LazyYAxis,
  LazyCartesianGrid,
  LazyTooltip,
  LazyResponsiveContainer,
  ChartLoadingSkeleton,
} from '@/components/ui/lazy-charts'
import { Badge } from '@/components/ui/badge'
import { Calendar, CalendarRange } from 'lucide-react'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'

interface DateVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface DateStats {
  earliest: Date | null
  latest: Date | null
  spanDays: number
  mostCommonPeriod: string
  validCount: number
  invalidCount: number
}

interface TimelineBin {
  period: string
  count: number
  date: Date
}

/**
 * Parse a date from various formats
 */
function parseDate(value: unknown): Date | null {
  if (!value) return null

  // Handle Date object
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value
  }

  // Handle string
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    // Try ISO format first
    const isoDate = new Date(trimmed)
    if (!isNaN(isoDate.getTime())) {
      return isoDate
    }

    // Try common formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY or MM-DD-YYYY
    ]

    for (const regex of formats) {
      const match = trimmed.match(regex)
      if (match) {
        const parsed = new Date(trimmed)
        if (!isNaN(parsed.getTime())) {
          return parsed
        }
      }
    }
  }

  // Handle number (timestamp)
  if (typeof value === 'number') {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  return null
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get month-year string for grouping
 */
function getMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  })
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Analyze date responses
 */
function analyzeDates(responses: StudyFlowResponseRow[]): {
  stats: DateStats
  timeline: TimelineBin[]
  dates: Date[]
} {
  const dates: Date[] = []
  let invalidCount = 0

  for (const response of responses) {
    const date = parseDate(response.response_value)
    if (date) {
      dates.push(date)
    } else {
      invalidCount++
    }
  }

  if (dates.length === 0) {
    return {
      stats: {
        earliest: null,
        latest: null,
        spanDays: 0,
        mostCommonPeriod: '',
        validCount: 0,
        invalidCount,
      },
      timeline: [],
      dates: [],
    }
  }

  // Sort dates
  dates.sort((a, b) => a.getTime() - b.getTime())

  const earliest = dates[0]
  const latest = dates[dates.length - 1]
  const spanDays = daysBetween(earliest, latest)

  // Group by month for timeline
  const monthCounts = new Map<string, { count: number; date: Date }>()
  for (const date of dates) {
    const key = getMonthYear(date)
    const existing = monthCounts.get(key)
    if (existing) {
      existing.count++
    } else {
      // Use first day of month as reference date
      monthCounts.set(key, {
        count: 1,
        date: new Date(date.getFullYear(), date.getMonth(), 1),
      })
    }
  }

  // Find most common period
  let mostCommonPeriod = ''
  let maxCount = 0
  for (const [period, data] of monthCounts.entries()) {
    if (data.count > maxCount) {
      maxCount = data.count
      mostCommonPeriod = period
    }
  }

  // Convert to timeline data, sorted by date
  const timeline = Array.from(monthCounts.entries())
    .map(([period, data]) => ({
      period,
      count: data.count,
      date: data.date,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  return {
    stats: {
      earliest,
      latest,
      spanDays,
      mostCommonPeriod,
      validCount: dates.length,
      invalidCount,
    },
    timeline,
    dates,
  }
}

/**
 * Visualization for date text responses.
 * Shows timeline and date range statistics.
 */
export function DateVisualization({
  question: _question,
  responses,
}: DateVisualizationProps) {
  const { stats, timeline } = useMemo(
    () => analyzeDates(responses),
    [responses]
  )

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No responses yet</p>
      </div>
    )
  }

  if (stats.validCount === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No valid dates found</p>
        <p className="text-xs mt-1">
          {stats.invalidCount} response{stats.invalidCount !== 1 ? 's' : ''} could not be parsed as dates
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Range Summary */}
      <div className="flex flex-wrap items-center gap-6">
        {/* Date Range */}
        <div className="flex items-center gap-3">
          <CalendarRange className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {stats.earliest && formatDate(stats.earliest)}
              <span className="mx-2 text-muted-foreground">→</span>
              {stats.latest && formatDate(stats.latest)}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.spanDays} day{stats.spanDays !== 1 ? 's' : ''} span
            </p>
          </div>
        </div>

        {/* Most Common */}
        {stats.mostCommonPeriod && (
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Most common</p>
              <p className="text-xs text-muted-foreground">{stats.mostCommonPeriod}</p>
            </div>
          </div>
        )}

        {/* Data Quality */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {stats.validCount} valid
          </Badge>
          {stats.invalidCount > 0 && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
              {stats.invalidCount} invalid
            </Badge>
          )}
        </div>
      </div>

      {/* Timeline Chart */}
      {timeline.length > 1 ? (
        <div className="h-[250px]" style={{ contain: 'layout' }}>
          <Suspense fallback={<ChartLoadingSkeleton height={250} />}>
            <LazyResponsiveContainer width="100%" height="100%">
              <LazyAreaChart
                data={timeline}
                margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="dateGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <LazyCartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <LazyXAxis
                  dataKey="period"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  className="text-muted-foreground"
                />
                <LazyYAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <LazyTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const data = payload[0].payload as TimelineBin
                    return (
                      <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-md">
                        <p className="text-sm font-medium">{data.period}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.count} response{data.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )
                  }}
                />
                <LazyArea
                  type="monotone"
                  dataKey="count"
                  stroke="var(--chart-1)"
                  strokeWidth={3}
                  fill="url(#dateGradient)"
                  isAnimationActive={false}
                />
              </LazyAreaChart>
            </LazyResponsiveContainer>
          </Suspense>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">All dates are in the same period: {timeline[0]?.period}</p>
          <p className="text-xs mt-1">{timeline[0]?.count} response{timeline[0]?.count !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Summary text */}
      <p className="text-xs text-muted-foreground text-center">
        Showing response distribution over {timeline.length} month{timeline.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
