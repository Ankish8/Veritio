'use client'
import { cn } from '@veritio/ui'
import { Badge } from '@veritio/ui/components/badge'
import { Checkbox } from '@veritio/ui/components/checkbox'
import { Clock, CheckCircle, XCircle } from 'lucide-react'
export function GridHeaderCell({
  children,
  className,
  align = 'left',
}: {
  children?: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
}) {
  return (
    <div
      className={cn(
        'px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
    >
      {children}
    </div>
  )
}
export function GridCell({
  children,
  className,
  align = 'left',
  onClick,
}: {
  children?: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
  onClick?: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className={cn(
        'px-4 py-3 text-sm text-foreground',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
export function GridCheckboxCell({
  checked,
  onCheckedChange,
  onClick,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  onClick?: (e: React.MouseEvent) => void
  disabled?: boolean
}) {
  return (
    <div
      className="flex items-center justify-center px-4"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(e)
      }}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  )
}

/**
 * Row container for participant grid.
 * IMPORTANT: Must accept `style` prop for ParticipantsListBase to inject
 * CSS Grid layout via cloneElement.
 */
export function GridRow({
  children,
  className,
  style,
  onClick,
  isExcluded,
  isSelected,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  isExcluded?: boolean
  isSelected?: boolean
}) {
  return (
    <div
      className={cn(
        'cursor-pointer hover:bg-muted/50 border-b border-border/50',
        isExcluded && 'opacity-50',
        isSelected && 'bg-muted',
        className
      )}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
export function ParticipantStatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="mr-1 h-3 w-3" />Completed
      </Badge>
    )
  }
  if (status === 'in_progress') {
    return (
      <Badge variant="outline">
        <Clock className="mr-1 h-3 w-3" />In Progress
      </Badge>
    )
  }
  return (
    <Badge variant="destructive">
      <XCircle className="mr-1 h-3 w-3" />Abandoned
    </Badge>
  )
}
