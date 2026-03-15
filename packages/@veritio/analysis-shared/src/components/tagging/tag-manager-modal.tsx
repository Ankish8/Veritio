'use client'
import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@veritio/ui/components/dialog'
import { Button } from '@veritio/ui/components/button'
import { Input } from '@veritio/ui/components/input'
import { Label } from '@veritio/ui/components/label'
import { Textarea } from '@veritio/ui/components/textarea'
import { ScrollArea } from '@veritio/ui/components/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@veritio/ui/components/alert-dialog'
import { Plus, Pencil, Trash2, Tag, Sparkles } from 'lucide-react'
import { TagBadge } from './tag-badge'
import { TagColorPicker } from './tag-color-picker'
import type { ResponseTag, ResponseTagWithCount } from '../../types/response-tags'
import { SUGGESTED_TAGS, TAG_COLORS } from '../../types/response-tags'

interface TagManagerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tags: ResponseTagWithCount[]
  onCreateTag: (name: string, color: string, description: string | null) => Promise<void>
  onUpdateTag: (tagId: string, name: string, color: string, description: string | null) => Promise<void>
  onDeleteTag: (tagId: string) => Promise<void>
  isLoading?: boolean
}

export function TagManagerModal({
  open,
  onOpenChange,
  tags,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  isLoading: _isLoading = false,
}: TagManagerModalProps) {
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingTag, setEditingTag] = useState<ResponseTag | null>(null)
  const [deleteConfirmTag, setDeleteConfirmTag] = useState<ResponseTag | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [color, setColor] = useState(TAG_COLORS[0])
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form
  const resetForm = useCallback(() => {
    setName('')
    setColor(TAG_COLORS[0])
    setDescription('')
    setError(null)
    setEditingTag(null)
  }, [])

  // Handle create
  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError('Tag name is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await onCreateTag(name.trim(), color, description.trim() || null)
      resetForm()
      setMode('list')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag')
    } finally {
      setSubmitting(false)
    }
  }, [name, color, description, onCreateTag, resetForm])

  // Handle update
  const handleUpdate = useCallback(async () => {
    if (!editingTag || !name.trim()) {
      setError('Tag name is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await onUpdateTag(editingTag.id, name.trim(), color, description.trim() || null)
      resetForm()
      setMode('list')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tag')
    } finally {
      setSubmitting(false)
    }
  }, [editingTag, name, color, description, onUpdateTag, resetForm])

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deleteConfirmTag) return

    setSubmitting(true)

    try {
      await onDeleteTag(deleteConfirmTag.id)
      setDeleteConfirmTag(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag')
    } finally {
      setSubmitting(false)
    }
  }, [deleteConfirmTag, onDeleteTag])

  // Start editing
  const startEdit = useCallback((tag: ResponseTag) => {
    setEditingTag(tag)
    setName(tag.name)
    setColor(tag.color)
    setDescription(tag.description || '')
    setMode('edit')
  }, [])

  // Create from suggestion
  const createFromSuggestion = useCallback((suggestion: typeof SUGGESTED_TAGS[0]) => {
    setName(suggestion.name)
    setColor(suggestion.color)
    setDescription(suggestion.description || '')
    setMode('create')
  }, [])

  // Get unused suggestions
  const unusedSuggestions = SUGGESTED_TAGS.filter(
    suggestion => !tags.some(tag => tag.name.toLowerCase() === suggestion.name.toLowerCase())
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {mode === 'list' && 'Manage Tags'}
              {mode === 'create' && 'Create Tag'}
              {mode === 'edit' && 'Edit Tag'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'list' && 'Create and manage tags to categorize responses.'}
              {mode === 'create' && 'Create a new tag for categorizing responses.'}
              {mode === 'edit' && 'Update the tag details.'}
            </DialogDescription>
          </DialogHeader>

          {mode === 'list' ? (
            <div className="space-y-4">
              {/* Existing Tags */}
              {tags.length > 0 ? (
                <ScrollArea className="h-[200px] pr-4">
                  <div className="space-y-2">
                    {tags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <TagBadge tag={tag} />
                          <span className="text-xs text-muted-foreground">
                            {tag.assignment_count} uses
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEdit(tag)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmTag(tag)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Tag className="h-12 w-12 mb-4 opacity-50" />
                  <p>No tags created yet</p>
                  <p className="text-sm">Create your first tag below</p>
                </div>
              )}

              {/* Suggested Tags */}
              {unusedSuggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    <span>Suggested tags</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unusedSuggestions.slice(0, 4).map((suggestion) => (
                      <button
                        key={suggestion.name}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border hover:bg-muted transition-colors"
                        onClick={() => createFromSuggestion(suggestion)}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: suggestion.color }}
                        />
                        {suggestion.name}
                        <Plus className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button onClick={() => setMode('create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tag
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="tag-name">Name</Label>
                <Input
                  id="tag-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Positive, Confused, Actionable"
                  maxLength={50}
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label>Color</Label>
                <TagColorPicker value={color} onChange={setColor} />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="tag-description">Description (optional)</Label>
                <Textarea
                  id="tag-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of when to use this tag"
                  rows={2}
                  maxLength={255}
                />
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <TagBadge
                  tag={{
                    id: 'preview',
                    study_id: '',
                    name: name || 'Tag Name',
                    color,
                    description: null,
                    created_at: '',
                    created_by: null,
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    setMode('list')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={mode === 'create' ? handleCreate : handleUpdate}
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmTag}
        onOpenChange={(open) => !open && setDeleteConfirmTag(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag &ldquo;{deleteConfirmTag?.name}&rdquo;?
              This will remove it from all responses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
