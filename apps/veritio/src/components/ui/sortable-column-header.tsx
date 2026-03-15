'use client'

import { memo } from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { SortDirection } from '@/hooks/use-sorting'

export interface SortableColumnHeaderProps {
  /** Column label text */
  children: React.ReactNode
  /** Current sort direction for this column (null if not sorted) */
  direction: SortDirection | null
  /** Called when header is clicked */
  onClick: () => void
  /** Additional class names */
  className?: string
  /** Alignment of the header content */
  align?: 'left' | 'center' | 'right'
  /** Whether the column is currently being sorted */
  isActive?: boolean
}

/**
 * Sortable table column header with sort indicators.
 * Shows current sort direction and toggles on click.
 *
 * @example
 * const { toggleSort, getSortDirection } = useSorting(data)
 *
 * <TableHead>
 *   <SortableColumnHeader
 *     direction={getSortDirection('name')}
 *     onClick={() => toggleSort('name')}
 *   >
 *     Name
 *   </SortableColumnHeader>
 * </TableHead>
 */
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

/**
 * Sort direction indicator icon.
 * Shows up/down arrow for sorted columns, or up-down for unsorted.
 */
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
