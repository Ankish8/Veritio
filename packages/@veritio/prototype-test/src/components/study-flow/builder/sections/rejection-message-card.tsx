'use client'

import { memo } from 'react'
import { cn, truncateText } from '@veritio/ui'
import { Ban } from 'lucide-react'

export interface RejectionMessageCardProps {
  title: string
  isSelected: boolean
  onClick: () => void
}
export const RejectionMessageCard = memo(function RejectionMessageCard({
  title,
  isSelected,
  onClick,
}: RejectionMessageCardProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all cursor-pointer',
        isSelected
          ? 'bg-primary/5 border-primary/30'
          : 'bg-background border-border/50 hover:border-border hover:bg-muted/30'
      )}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted shrink-0">
        <Ban className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium block">{truncateText(title || 'Rejection message')}</span>
        <span className="text-xs text-muted-foreground">Rejection message</span>
      </div>
    </div>
  )
})
