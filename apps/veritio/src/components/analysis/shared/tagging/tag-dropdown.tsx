'use client'


import { useState, useCallback } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Check, Plus, Tag, Settings } from 'lucide-react'
import { TagBadge } from './tag-badge'
import type { ResponseTag, ResponseTagWithCount } from '@/types/response-tags'

interface TagDropdownProps {
  availableTags: ResponseTagWithCount[]
  assignedTags: ResponseTag[]
  onAssign: (tagId: string) => Promise<void>
  onRemove: (tagId: string) => Promise<void>
  onManageTags: () => void
  disabled?: boolean
}

export function TagDropdown({
  availableTags,
  assignedTags,
  onAssign,
  onRemove,
  onManageTags,
  disabled = false,
}: TagDropdownProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const isAssigned = useCallback((tagId: string) => {
    return assignedTags.some(t => t.id === tagId)
  }, [assignedTags])

  const handleToggle = useCallback(async (tagId: string) => {
    setLoading(tagId)
    try {
      if (isAssigned(tagId)) {
        await onRemove(tagId)
      } else {
        await onAssign(tagId)
      }
    } finally {
      setLoading(null)
    }
  }, [isAssigned, onAssign, onRemove])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5"
          disabled={disabled}
        >
          <Tag className="h-3.5 w-3.5" />
          {assignedTags.length > 0 ? (
            <span className="text-xs">{assignedTags.length}</span>
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Assign Tags
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {availableTags.length > 0 ? (
          <>
            {availableTags.map((tag) => {
              const assigned = isAssigned(tag.id)
              const isLoading = loading === tag.id

              return (
                <DropdownMenuItem
                  key={tag.id}
                  onClick={(e) => {
                    e.preventDefault()
                    handleToggle(tag.id)
                  }}
                  disabled={isLoading}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className={assigned ? 'font-medium' : ''}>
                      {tag.name}
                    </span>
                  </div>
                  {assigned && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
          </>
        ) : (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            No tags available
          </div>
        )}

        <DropdownMenuItem
          onClick={onManageTags}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Manage Tags
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Compact tag display for response cards
 */
interface ResponseTagsDisplayProps {
  tags: ResponseTag[]
  maxVisible?: number
  onRemove?: (tagId: string) => void
}

export function ResponseTagsDisplay({
  tags,
  maxVisible = 3,
  onRemove,
}: ResponseTagsDisplayProps) {
  if (tags.length === 0) return null

  const visibleTags = tags.slice(0, maxVisible)
  const remainingCount = tags.length - maxVisible

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size="sm"
          showRemove={!!onRemove}
          onRemove={() => onRemove?.(tag.id)}
        />
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-muted-foreground">
          +{remainingCount} more
        </span>
      )}
    </div>
  )
}
