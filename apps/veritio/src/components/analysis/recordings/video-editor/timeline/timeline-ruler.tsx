'use client'

import { useMemo } from 'react'
import { formatDuration } from '@/lib/utils'

export interface TimelineRulerProps {
  duration: number
  pixelsPerMs: number
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}

/**
 * Time ruler with tick marks and time labels.
 * Adapts tick density based on zoom level.
 */
export function TimelineRuler({
  duration,
  pixelsPerMs,
  onClick,
}: TimelineRulerProps) {
  // Calculate appropriate tick interval based on zoom
  const { majorInterval, minorInterval } = useMemo(() => {
    const pixelsPerSecond = pixelsPerMs * 1000

    // Choose interval so ticks are ~80-150px apart
    if (pixelsPerSecond >= 200) {
      return { majorInterval: 1000, minorInterval: 200 } // 1s major, 200ms minor
    } else if (pixelsPerSecond >= 100) {
      return { majorInterval: 5000, minorInterval: 1000 } // 5s major, 1s minor
    } else if (pixelsPerSecond >= 40) {
      return { majorInterval: 10000, minorInterval: 2000 } // 10s major, 2s minor
    } else if (pixelsPerSecond >= 20) {
      return { majorInterval: 30000, minorInterval: 5000 } // 30s major, 5s minor
    } else {
      return { majorInterval: 60000, minorInterval: 10000 } // 1m major, 10s minor
    }
  }, [pixelsPerMs])

  // Generate tick marks
  const ticks = useMemo(() => {
    const result: Array<{ time: number; isMajor: boolean; position: number }> = []

    for (let time = 0; time <= duration; time += minorInterval) {
      const isMajor = time % majorInterval === 0
      result.push({
        time,
        isMajor,
        position: time * pixelsPerMs,
      })
    }

    return result
  }, [duration, majorInterval, minorInterval, pixelsPerMs])

  return (
    <div
      className="h-6 bg-muted/50 border-b relative select-none cursor-pointer"
      onClick={onClick}
    >
      {ticks.map((tick) => (
        <div
          key={tick.time}
          className="absolute top-0"
          style={{ left: tick.position }}
        >
          {/* Tick mark */}
          <div
            className={tick.isMajor ? 'w-px h-3 bg-muted-foreground/50' : 'w-px h-2 bg-border'}
          />

          {/* Time label for major ticks */}
          {tick.isMajor && (
            <span className="absolute top-3 left-1 text-[12px] text-muted-foreground whitespace-nowrap">
              {formatDuration(tick.time)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
