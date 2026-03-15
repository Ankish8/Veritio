'use client'

import { useMemo } from 'react'
import { Clock } from 'lucide-react'

interface TimeDisplayProps {
  avgMs: number
  times?: number[]
}

function formatTime(ms: number): string {
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`
  }
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

function formatTimeDetailed(ms: number): { minutes: number; seconds: number } {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return { minutes, seconds }
}

export function TimeDisplay({ avgMs, times }: TimeDisplayProps) {
  const timeStats = useMemo(() => {
    if (!times || times.length === 0) {
      return { median: avgMs, min: 0, max: 0, hasRange: false, count: 0 }
    }
    const sortedTimes = [...times].sort((a, b) => a - b)

    if (sortedTimes.length === 0) return { median: avgMs, min: 0, max: 0, hasRange: false, count: 0 }

    const median = sortedTimes[Math.floor(sortedTimes.length / 2)]
    return {
      median,
      min: sortedTimes[0],
      max: sortedTimes[sortedTimes.length - 1],
      hasRange: sortedTimes.length > 1,
      count: sortedTimes.length
    }
  }, [times, avgMs])

  const displayTime = timeStats.median > 0 ? timeStats.median : avgMs
  const { minutes, seconds } = formatTimeDetailed(displayTime)

  // Calculate position of median on the range (0-100%)
  const medianPosition = useMemo(() => {
    if (!timeStats.hasRange || timeStats.max === timeStats.min) return 50
    return ((timeStats.median - timeStats.min) / (timeStats.max - timeStats.min)) * 100
  }, [timeStats])

  if (displayTime === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <Clock className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <span className="text-muted-foreground text-sm">Waiting for data</span>
      </div>
    )
  }

  return (
    <div className="py-3">
      {/* Time display in pill */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
          <Clock className="h-5 w-5 text-primary" />
          <span className="text-3xl font-bold">{minutes}m {seconds}s</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          median of {timeStats.count} response{timeStats.count !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Range visualization */}
      {timeStats.hasRange && (
        <div className="relative pt-6 pb-2">
          {/* Track */}
          <div className="h-3 bg-gradient-to-r from-emerald-100 via-blue-100 to-amber-100 rounded-full" />

          {/* Median marker */}
          <div
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${medianPosition}%`, transform: 'translateX(-50%)' }}
          >
            <div className="text-xs font-medium text-primary mb-1">median</div>
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary" />
            <div className="w-1 h-3 bg-primary -mt-0.5" />
          </div>

          {/* Min marker */}
          <div className="absolute left-0 top-3 w-1 h-6 bg-emerald-500 rounded-full" />

          {/* Max marker */}
          <div className="absolute right-0 top-3 w-1 h-6 bg-amber-500 rounded-full" />

          {/* Labels */}
          <div className="flex justify-between mt-1">
            <span className="text-xs font-medium text-emerald-600">{formatTime(timeStats.min)}</span>
            <span className="text-xs font-medium text-amber-600">{formatTime(timeStats.max)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
