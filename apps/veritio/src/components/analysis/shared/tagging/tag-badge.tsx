'use client'


import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ResponseTag } from '@/types/response-tags'

interface TagBadgeProps {
  tag: ResponseTag
  onRemove?: () => void
  size?: 'sm' | 'default'
  showRemove?: boolean
}

export function TagBadge({
  tag,
  onRemove,
  size = 'default',
  showRemove = false,
}: TagBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'text-[12px] px-1.5 py-0 h-5'
    : 'text-xs px-2 py-0.5'

  return (
    <Badge
      variant="outline"
      className={`${sizeClasses} gap-1 font-medium`}
      style={{
        borderColor: tag.color,
        backgroundColor: `${tag.color}20`,
        color: tag.color,
      }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: tag.color }}
      />
      {tag.name}
      {showRemove && onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-3 w-3 p-0 hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <X className="h-2.5 w-2.5" />
        </Button>
      )}
    </Badge>
  )
}

export function TagBadgeSkeleton() {
  return (
    <Badge
      variant="outline"
      className="text-xs px-2 py-0.5 gap-1 animate-pulse"
    >
      <span className="w-2 h-2 rounded-full bg-muted" />
      <span className="w-12 h-3 bg-muted rounded" />
    </Badge>
  )
}
