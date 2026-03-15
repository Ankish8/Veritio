'use client'

/**
 * TagManagementPanel Component
 *
 * Organization settings panel for managing study tags.
 */

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Loader2, GripVertical, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CreateTagDialog } from './create-tag-dialog'
import { EditTagDialog } from './edit-tag-dialog'
import { useOrganizationStudyTags } from '@/hooks/use-study-tags'
import { STUDY_TAG_GROUPS } from '@/types/study-tags'
import type { StudyTagWithCount, StudyTagGroup } from '@/types/study-tags'

interface TagManagementPanelProps {
  organizationId: string
}

export function TagManagementPanel({ organizationId }: TagManagementPanelProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<StudyTagWithCount | null>(null)
  const [deletingTag, setDeletingTag] = useState<StudyTagWithCount | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { tags, isLoading, createTag, updateTag, deleteTag, isDeleting } =
    useOrganizationStudyTags(organizationId)

  // Group tags by group type
  const groupedTags = useMemo(() => {
    const groups: Record<StudyTagGroup, StudyTagWithCount[]> = {
      product_area: [],
      team: [],
      methodology: [],
      status: [],
      custom: [],
    }

    const filtered = searchQuery
      ? tags.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : tags

    filtered.forEach((tag) => {
      const group = (tag.tag_group as StudyTagGroup) || 'custom'
      groups[group].push(tag)
    })

    return groups
  }, [tags, searchQuery])

  const handleCreate = async (name: string, color: string, group: StudyTagGroup) => {
    await createTag({ name, color, tag_group: group })
    setCreateOpen(false)
  }

  const handleUpdate = async (name: string, color: string, group: StudyTagGroup) => {
    if (!editingTag) return
    await updateTag(editingTag.id, { name, color, tag_group: group })
    setEditingTag(null)
  }

  const handleDelete = async () => {
    if (!deletingTag) return
    await deleteTag(deletingTag.id)
    setDeletingTag(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Study Tags</h3>
          <p className="text-sm text-muted-foreground">
            Organize your studies with custom tags.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tag
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search tags..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      {/* Tags by group */}
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-6">
          {STUDY_TAG_GROUPS.map((groupConfig) => {
            const groupTags = groupedTags[groupConfig.value]

            return (
              <div key={groupConfig.value}>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">{groupConfig.label}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {groupTags.length}
                  </Badge>
                </div>

                {groupTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">
                    No tags in this category.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {groupTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-move" />

                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />

                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tag.name}</p>
                          {tag.study_count !== undefined && tag.study_count > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {tag.study_count} {tag.study_count === 1 ? 'study' : 'studies'}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingTag(tag)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletingTag(tag)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Create dialog */}
      <CreateTagDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
      />

      {/* Edit dialog */}
      <EditTagDialog
        open={!!editingTag}
        onOpenChange={(open) => !open && setEditingTag(null)}
        onSave={handleUpdate}
        tag={editingTag}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingTag} onOpenChange={(open) => !open && setDeletingTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTag?.name}"?
              {deletingTag?.study_count && deletingTag.study_count > 0 && (
                <>
                  {' '}
                  This tag is used on {deletingTag.study_count}{' '}
                  {deletingTag.study_count === 1 ? 'study' : 'studies'}.
                </>
              )}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
