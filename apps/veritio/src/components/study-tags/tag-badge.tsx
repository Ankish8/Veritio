'use client'

/**
 * TagBadge Component
 *
 * Displays a colored tag badge.
 */

import { cn } from '@/lib/utils'
import type { StudyTag } from '@/types/study-tags'

interface TagBadgeProps {
  tag: StudyTag
  size?: 'sm' | 'default'
  showRemove?: boolean
  onRemove?: () => void
  className?: string
}

export function TagBadge({
  tag,
  size = 'default',
  showRemove,
  onRemove,
  className,
}: TagBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'text-[12px] px-1.5 py-0.5'
    : 'text-xs px-2 py-1'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        sizeClasses,
        className
      )}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        borderColor: tag.color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      {tag.name}
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      )}
    </span>
  )
}

interface TagBadgeGroupProps {
  tags: StudyTag[]
  size?: 'sm' | 'default'
  maxDisplay?: number
  className?: string
}

export function TagBadgeGroup({
  tags,
  size = 'default',
  maxDisplay = 3,
  className,
}: TagBadgeGroupProps) {
  const displayTags = tags.slice(0, maxDisplay)
  const remaining = tags.length - maxDisplay

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {displayTags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} size={size} />
      ))}
      {remaining > 0 && (
        <span
          className={cn(
            'inline-flex items-center rounded-full bg-muted text-muted-foreground',
            size === 'sm' ? 'text-[12px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
          )}
        >
          +{remaining}
        </span>
      )}
    </div>
  )
}
