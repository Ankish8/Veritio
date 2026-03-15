'use client'

/**
 * View Toggle Component
 *
 * Toggles between "Card view", "Timeline view", and optionally "Word Cloud" for responses.
 */

import { Button } from '@/components/ui/button'
import { LayoutGrid, Cloud } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ResponseViewMode = 'cards' | 'timeline' | 'word-cloud'

interface ViewToggleProps {
  value: ResponseViewMode
  onChange: (value: ResponseViewMode) => void
  /** Only show the word cloud button when true */
  showWordCloud?: boolean
  className?: string
}

export function ViewToggle({ value, onChange, showWordCloud, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center gap-1 p-1 bg-muted rounded-lg', className)}>
      <Button
        variant={value === 'cards' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => onChange('cards')}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Cards
      </Button>
      {showWordCloud && (
        <Button
          variant={value === 'word-cloud' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => onChange('word-cloud')}
        >
          <Cloud className="h-3.5 w-3.5" />
          Word Cloud
        </Button>
      )}
    </div>
  )
}
