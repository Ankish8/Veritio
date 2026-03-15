'use client'

/**
 * TagSelector Component
 *
 * A tag selection UI that supports both predefined tags and custom freeform tags.
 * Used for categorizing clips in the ClipsTab.
 */

import { useState, useCallback, KeyboardEvent } from 'react'
import { X, Plus, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** Default predefined tags if none provided */
export const DEFAULT_CLIP_TAGS = [
  'Key Insight',
  'Usability Issue',
  'Pain Point',
  'Success Moment',
  'Confusion',
  'Feature Request',
  'Quote',
] as const

export interface TagSelectorProps {
  /** Currently selected tags */
  selectedTags: string[]
  /** Callback when tags change */
  onTagsChange: (tags: string[]) => void
  /** Predefined tags to suggest (defaults to DEFAULT_CLIP_TAGS) */
  predefinedTags?: string[]
  /** Maximum number of tags allowed (default: 5) */
  maxTags?: number
  /** Maximum length per tag (default: 30) */
  maxTagLength?: number
  /** Whether the selector is disabled */
  disabled?: boolean
  /** Optional className */
  className?: string
  /** Show inline or stacked layout */
  layout?: 'inline' | 'stacked'
}

/**
 * Tag selection with predefined suggestions and custom tag input.
 *
 * @example
 * ```tsx
 * <TagSelector
 *   selectedTags={clipTags}
 *   onTagsChange={setClipTags}
 *   predefinedTags={study.predefined_clip_tags}
 * />
 * ```
 */
export function TagSelector({
  selectedTags,
  onTagsChange,
  predefinedTags = DEFAULT_CLIP_TAGS as unknown as string[],
  maxTags = 5,
  maxTagLength = 30,
  disabled = false,
  className,
  layout = 'stacked',
}: TagSelectorProps) {
  const [customInput, setCustomInput] = useState('')
  const [isAddingCustom, setIsAddingCustom] = useState(false)

  // Check if we've reached the tag limit
  const isAtLimit = selectedTags.length >= maxTags

  // Toggle a tag selection
  const toggleTag = useCallback(
    (tag: string) => {
      if (disabled) return

      if (selectedTags.includes(tag)) {
        // Remove tag
        onTagsChange(selectedTags.filter((t) => t !== tag))
      } else if (!isAtLimit) {
        // Add tag
        onTagsChange([...selectedTags, tag])
      }
    },
    [selectedTags, onTagsChange, disabled, isAtLimit]
  )

  // Add a custom tag
  const addCustomTag = useCallback(() => {
    const trimmed = customInput.trim().slice(0, maxTagLength)

    if (!trimmed) return
    if (selectedTags.includes(trimmed)) {
      setCustomInput('')
      return
    }
    if (isAtLimit) return

    onTagsChange([...selectedTags, trimmed])
    setCustomInput('')
    setIsAddingCustom(false)
  }, [customInput, selectedTags, onTagsChange, isAtLimit, maxTagLength])

  // Handle keyboard input for custom tag
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        addCustomTag()
      } else if (e.key === 'Escape') {
        setCustomInput('')
        setIsAddingCustom(false)
      }
    },
    [addCustomTag]
  )

  // Get available predefined tags (not yet selected)
  const availablePredefinedTags = predefinedTags.filter(
    (tag) => !selectedTags.includes(tag)
  )

  // Get custom tags (selected but not in predefined list)
  const _customTags = selectedTags.filter(
    (tag) => !predefinedTags.includes(tag)
  )

  return (
    <div className={cn('space-y-3', className)}>
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="default"
              className={cn(
                'gap-1 pr-1',
                disabled && 'opacity-60 cursor-not-allowed'
              )}
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="ml-0.5 rounded-full hover:bg-primary-foreground/20 p-0.5"
                  aria-label={`Remove ${tag} tag`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Tag limit indicator */}
      {isAtLimit && (
        <p className="text-xs text-muted-foreground">
          Maximum {maxTags} tags reached
        </p>
      )}

      {/* Predefined tag suggestions */}
      {!isAtLimit && availablePredefinedTags.length > 0 && (
        <div
          className={cn(
            layout === 'inline'
              ? 'flex flex-wrap items-center gap-1.5'
              : 'space-y-2'
          )}
        >
          {layout === 'stacked' && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Suggested tags:
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {availablePredefinedTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={cn(
                  'cursor-pointer transition-colors hover:bg-accent',
                  disabled && 'opacity-60 cursor-not-allowed'
                )}
                onClick={() => toggleTag(tag)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Custom tag input */}
      {!isAtLimit && !disabled && (
        <div className="flex items-center gap-2">
          {isAddingCustom ? (
            <>
              <Input
                type="text"
                placeholder="Type custom tag..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={maxTagLength}
                className="h-8 text-sm"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addCustomTag}
                disabled={!customInput.trim()}
                className="h-8"
              >
                Add
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCustomInput('')
                  setIsAddingCustom(false)
                }}
                className="h-8"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsAddingCustom(true)}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add custom tag
            </Button>
          )}
        </div>
      )}

      {/* Character count for custom input */}
      {isAddingCustom && customInput.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {customInput.length}/{maxTagLength}
        </p>
      )}
    </div>
  )
}
