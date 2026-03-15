'use client'

/**
 * TagFilterDropdown Component
 *
 * Dropdown for filtering studies by tags in the dashboard.
 */

import { useState, useMemo } from 'react'
import { Check, Filter, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useOrganizationStudyTags } from '@/hooks/use-study-tags'
import { STUDY_TAG_GROUPS } from '@/types/study-tags'
import type { StudyTagWithCount, StudyTagGroup } from '@/types/study-tags'

interface TagFilterDropdownProps {
  organizationId: string
  selectedTagIds: string[]
  onSelectionChange: (tagIds: string[]) => void
  className?: string
}

export function TagFilterDropdown({
  organizationId,
  selectedTagIds,
  onSelectionChange,
  className,
}: TagFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const { tags, isLoading } = useOrganizationStudyTags(organizationId)

  // Group tags by group type
  const groupedTags = useMemo(() => {
    const groups: Record<StudyTagGroup, StudyTagWithCount[]> = {
      product_area: [],
      team: [],
      methodology: [],
      status: [],
      custom: [],
    }

    tags.forEach((tag) => {
      const group = tag.tag_group as StudyTagGroup || 'custom'
      groups[group].push(tag)
    })

    return groups
  }, [tags])

  const selectedTags = useMemo(() => {
    return tags.filter((t) => selectedTagIds.includes(t.id))
  }, [tags, selectedTagIds])

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onSelectionChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onSelectionChange([...selectedTagIds, tagId])
    }
  }

  const handleClearAll = () => {
    onSelectionChange([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-1.5', className)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Filter className="h-3.5 w-3.5" />
          )}
          Tags
          {selectedTagIds.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {selectedTagIds.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tags..." />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>

            {/* Selected tags summary */}
            {selectedTags.length > 0 && (
              <>
                <CommandGroup heading="Selected">
                  <div className="flex flex-wrap gap-1 px-2 py-1.5">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleTag(tag.id)
                          }}
                          className="hover:opacity-70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <CommandItem onSelect={handleClearAll} className="text-xs text-muted-foreground">
                    Clear all
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Render tags by group */}
            {STUDY_TAG_GROUPS.map((groupConfig) => {
              const groupTags = groupedTags[groupConfig.value]
              if (groupTags.length === 0) return null

              return (
                <CommandGroup key={groupConfig.value} heading={groupConfig.label}>
                  {groupTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => handleToggleTag(tag.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedTagIds.includes(tag.id) ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full mr-2"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1">{tag.name}</span>
                      {tag.study_count !== undefined && tag.study_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {tag.study_count}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
