'use client'

import { cn } from '@/lib/utils'

export type PietreeLayout = 'horizontal' | 'radial'

interface PietreeControlsProps {
  layout: PietreeLayout
  onLayoutChange: (layout: PietreeLayout) => void
  className?: string
}

/**
 * Controls for Pietree visualization.
 * Provides toggle buttons for switching between horizontal and radial layouts.
 */
export function PietreeControls({
  layout,
  onLayoutChange,
  className,
}: PietreeControlsProps) {
  return (
    <div className={`inline-flex rounded-lg border border-stone-200 p-0.5 bg-white ${className || ''}`}>
      <button
        type="button"
        onClick={() => onLayoutChange('horizontal')}
        className={cn(
          'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
          layout === 'horizontal'
            ? 'bg-stone-900 text-white'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
        )}
      >
        Horizontal
      </button>
      <button
        type="button"
        onClick={() => onLayoutChange('radial')}
        className={cn(
          'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
          layout === 'radial'
            ? 'bg-stone-900 text-white'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
        )}
      >
        Radial
      </button>
    </div>
  )
}
