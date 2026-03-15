'use client'

import { useMemo } from 'react'
import { useMediaState } from '@vidstack/react'
import { cn } from '@/lib/utils'

/**
 * Animated audio waveform visualization for audio-only recordings.
 * Shows random-height bars that animate when playing.
 */
export function AudioWaveform() {
  const paused = useMediaState('paused')
  const isPlaying = !paused

  // Generate stable random heights and transforms for bars (only once)
  const barData = useMemo(() => {
    return Array.from({ length: 40 }, () => ({
      // eslint-disable-next-line react-hooks/purity
      height: 20 + Math.random() * 60,
      // eslint-disable-next-line react-hooks/purity
      scale: 0.7 + Math.random() * 0.3,
    }))
  }, [])

  return (
    <div className="h-32 bg-black flex items-center justify-center">
      <div className="flex items-center gap-1 h-full py-4">
        {barData.map((bar, i) => (
          <div
            key={i}
            className={cn(
              'w-1.5 bg-primary rounded-full transition-all duration-150',
              isPlaying && 'animate-pulse'
            )}
            style={{
              height: `${bar.height}%`,
              animationDelay: `${i * 50}ms`,
              transform: isPlaying ? `scaleY(${bar.scale})` : 'scaleY(1)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
