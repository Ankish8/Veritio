'use client'

/**
 * Edit Tags Dialog
 *
 * Dialog for managing participant tag assignments.
 * Shows available tags with checkboxes, allows toggling, and creating new tags.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Tag } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { usePanelTags, usePanelTagAssignments } from '@/hooks/panel/use-panel-tags'
import { usePanelParticipant } from '@/hooks/panel/use-panel-participants'
import type { PanelParticipantWithDetails, PanelTag } from '@/lib/supabase/panel-types'

interface EditTagsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participant: PanelParticipantWithDetails
  onSuccess: () => void
}

const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#6b7280', // gray
]

export function EditTagsDialog({
  open,
  onOpenChange,
  participant,
  onSuccess,
}: EditTagsDialogProps) {
  const { tags: allTags, isLoading: isLoadingTags, createTag } = usePanelTags()
  const { assignTag, removeTag } = usePanelTagAssignments(participant.id)
  const { mutate: mutateParticipant } = usePanelParticipant(participant.id)

  // Track assigned tag IDs locally for optimistic updates
  const [assignedTagIds, setAssignedTagIds] = useState<Set<string>>(new Set())
  const [pendingChanges, setPendingChanges] = useState<Map<string, 'add' | 'remove'>>(new Map())
  const [isSubmitting, setIsSubmitting] = useState(false)

  // New tag form
  const [showNewTagForm, setShowNewTagForm] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)])
  const [isCreatingTag, setIsCreatingTag] = useState(false)

  // Initialize assigned tags from participant
  useEffect(() => {
    if (participant.tags) {
      setAssignedTagIds(new Set(participant.tags.map((t) => t.id)))
    }
    setPendingChanges(new Map())
  }, [participant.tags, open])

  // Filter out system tags from available tags
  const availableTags = useMemo(() => {
    return allTags.filter((t) => !t.is_system)
  }, [allTags])

  const handleTagToggle = useCallback((tagId: string, checked: boolean) => {
    setAssignedTagIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(tagId)
      } else {
        next.delete(tagId)
      }
      return next
    })

    // Track the change
    const originallyAssigned = participant.tags?.some((t) => t.id === tagId)
    setPendingChanges((prev) => {
      const next = new Map(prev)
      if (checked && !originallyAssigned) {
        next.set(tagId, 'add')
      } else if (!checked && originallyAssigned) {
        next.set(tagId, 'remove')
      } else {
        next.delete(tagId) // No change from original
      }
      return next
    })
  }, [participant.tags])

  const handleCreateTag = useCallback(async () => {
    if (!newTagName.trim()) return

    setIsCreatingTag(true)
    try {
      const tag = await createTag({
        name: newTagName.trim(),
        color: newTagColor,
      })

      // Auto-assign the new tag
      setAssignedTagIds((prev) => new Set([...prev, tag.id]))
      setPendingChanges((prev) => new Map([...prev, [tag.id, 'add']]))

      setNewTagName('')
      setShowNewTagForm(false)
      toast.success('Tag created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create tag')
    } finally {
      setIsCreatingTag(false)
    }
  }, [newTagName, newTagColor, createTag])

  const handleSubmit = useCallback(async () => {
    if (pendingChanges.size === 0) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)
    try {
      // Apply all pending changes
      const promises: Promise<unknown>[] = []

      pendingChanges.forEach((action, tagId) => {
        if (action === 'add') {
          promises.push(assignTag(tagId))
        } else {
          promises.push(removeTag(tagId))
        }
      })

      await Promise.all(promises)

      // Revalidate participant data
      await mutateParticipant()

      toast.success('Tags updated')
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update tags')
    } finally {
      setIsSubmitting(false)
    }
  }, [pendingChanges, assignTag, removeTag, mutateParticipant, onSuccess, onOpenChange])

  const hasChanges = pendingChanges.size > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Manage Tags
          </DialogTitle>
          <DialogDescription>
            Select tags to assign to this participant.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Tag list */}
          {isLoadingTags ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableTags.length === 0 && !showNewTagForm ? (
            <div className="text-center py-8">
              <Tag className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No tags created yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewTagForm(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create First Tag
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {availableTags.map((tag) => (
                <TagCheckboxItem
                  key={tag.id}
                  tag={tag}
                  checked={assignedTagIds.has(tag.id)}
                  onCheckedChange={(checked) => handleTagToggle(tag.id, checked)}
                />
              ))}
            </div>
          )}

          {/* New tag form */}
          {showNewTagForm ? (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <Label className="text-sm font-medium">Create New Tag</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreateTag()
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || isCreatingTag}
                >
                  {isCreatingTag ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Add'
                  )}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-6 w-6 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: color,
                      borderColor: newTagColor === color ? 'white' : 'transparent',
                      boxShadow: newTagColor === color ? `0 0 0 2px ${color}` : 'none',
                    }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setShowNewTagForm(false)}
              >
                Cancel
              </Button>
            </div>
          ) : availableTags.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowNewTagForm(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create New Tag
            </Button>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !hasChanges}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface TagCheckboxItemProps {
  tag: PanelTag
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function TagCheckboxItem({ tag, checked, onCheckedChange }: TagCheckboxItemProps) {
  return (
    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <Badge
        variant="secondary"
        className="text-sm"
        style={{
          backgroundColor: `${tag.color}20`,
          color: tag.color,
          borderColor: `${tag.color}40`,
        }}
      >
        {tag.name}
      </Badge>
      {tag.description && (
        <span className="text-xs text-muted-foreground truncate flex-1">
          {tag.description}
        </span>
      )}
    </label>
  )
}
