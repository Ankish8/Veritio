'use client'

import { memo } from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { cn } from '../utils/cn'
import { Button } from './button'
import type { SortDirection } from '../hooks/use-sorting'

export interface SortableColumnHeaderProps {
  children: React.ReactNode
  direction: SortDirection | null
  onClick: () => void
  className?: string
  align?: 'left' | 'center' | 'right'
  isActive?: boolean
}
export const SortableColumnHeader = memo(function SortableColumnHeader({
  children,
  direction,
  onClick,
  className,
  align = 'left',
  isActive,
}: SortableColumnHeaderProps) {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        'hover:bg-muted/50 -ml-3 h-8 gap-1.5 px-3 font-medium',
        alignmentClasses[align],
        isActive ?? direction ? 'text-foreground' : 'text-muted-foreground',
        className
      )}
    >
      {children}
      <SortIndicator direction={direction} />
    </Button>
  )
})

interface SortIndicatorProps {
  direction: SortDirection | null
  className?: string
}
export const SortIndicator = memo(function SortIndicator({
  direction,
  className,
}: SortIndicatorProps) {
  const iconClass = cn('size-3.5 transition-transform', className)

  if (direction === 'asc') {
    return <ArrowUp className={iconClass} />
  }

  if (direction === 'desc') {
    return <ArrowDown className={iconClass} />
  }

  return <ArrowUpDown className={cn(iconClass, 'opacity-50')} />
})
