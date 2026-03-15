'use client'

/**
 * TagAssignmentCombobox Component
 *
 * Multi-select combobox for assigning tags to a study.
 */

import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { TagBadge } from './tag-badge'
import { CreateTagDialog } from './create-tag-dialog'
import { useOrganizationStudyTags, useStudyTagAssignments } from '@/hooks/use-study-tags'
import { STUDY_TAG_GROUPS } from '@/types/study-tags'
import type { StudyTag, StudyTagGroup } from '@/types/study-tags'

interface TagAssignmentComboboxProps {
  studyId: string
  organizationId: string
  disabled?: boolean
  className?: string
}

export function TagAssignmentCombobox({
  studyId,
  organizationId,
  disabled,
  className,
}: TagAssignmentComboboxProps) {
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { tags: allTags, isLoading: tagsLoading, createTag } = useOrganizationStudyTags(organizationId)
  const {
    tags: assignedTags,
    isLoading: assignmentsLoading,
    addTag,
    removeTag,
    isUpdating,
  } = useStudyTagAssignments(studyId)

  const isLoading = tagsLoading || assignmentsLoading

  // Group tags by group type
  const groupedTags = useMemo(() => {
    const groups: Record<StudyTagGroup, StudyTag[]> = {
      product_area: [],
      team: [],
      methodology: [],
      status: [],
      custom: [],
    }

    allTags.forEach((tag) => {
      const group = tag.tag_group as StudyTagGroup || 'custom'
      groups[group].push(tag)
    })

    return groups
  }, [allTags])

  const assignedTagIds = new Set(assignedTags.map((t) => t.id))

  const handleToggleTag = async (tag: StudyTag) => {
    if (assignedTagIds.has(tag.id)) {
      await removeTag(tag.id)
    } else {
      await addTag(tag.id)
    }
  }

  const handleCreateTag = async (name: string, color: string, group: StudyTagGroup) => {
    const newTag = await createTag({ name, color, tag_group: group })
    if (newTag) {
      await addTag(newTag.id)
    }
    setCreateOpen(false)
  }

  const handleRemoveTag = async (tagId: string) => {
    await removeTag(tagId)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading tags...
              </span>
            ) : assignedTags.length === 0 ? (
              <span className="text-muted-foreground">Select tags...</span>
            ) : (
              <span className="text-muted-foreground">
                {assignedTags.length} tag{assignedTags.length !== 1 ? 's' : ''} selected
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search tags..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                <div className="py-4 text-center text-sm">
                  <p className="text-muted-foreground mb-2">No tags found.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(false)
                      setCreateOpen(true)
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create "{searchQuery}"
                  </Button>
                </div>
              </CommandEmpty>

              {/* Render tags by group */}
              {STUDY_TAG_GROUPS.map((groupConfig) => {
                const groupTags = groupedTags[groupConfig.value]
                if (groupTags.length === 0) return null

                const filteredTags = searchQuery
                  ? groupTags.filter((t) =>
                      t.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : groupTags

                if (filteredTags.length === 0) return null

                return (
                  <CommandGroup key={groupConfig.value} heading={groupConfig.label}>
                    {filteredTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => handleToggleTag(tag)}
                        disabled={isUpdating}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            assignedTagIds.has(tag.id) ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span
                          className="h-2.5 w-2.5 rounded-full mr-2"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              })}

              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    setCreateOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create new tag
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Display assigned tags */}
      {assignedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {assignedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              showRemove
              onRemove={() => handleRemoveTag(tag.id)}
            />
          ))}
        </div>
      )}

      {/* Create tag dialog */}
      <CreateTagDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreateTag}
        initialName={searchQuery}
      />
    </div>
  )
}
