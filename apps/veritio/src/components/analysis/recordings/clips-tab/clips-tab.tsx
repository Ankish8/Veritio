'use client'

/**
 * ClipsTab Component
 *
 * Displays and manages recording clips (highlights).
 * Clips are timestamp ranges with titles that can be saved for reference.
 * Now enhanced with visual range selection, tags, and thumbnails.
 */

import { useState, useCallback } from 'react'
import { Plus, Scissors, Play, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { cn, formatDuration } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import { ClipRangeSelector } from './clip-range-selector'
import { TagSelector, DEFAULT_CLIP_TAGS } from './tag-selector'

export interface Clip {
  id: string
  recording_id: string
  start_ms: number
  end_ms: number
  title: string
  description: string | null
  tags: string[]
  thumbnail_url: string | null
  created_by: string
  created_at: string
}

interface ClipsTabProps {
  /** Recording ID */
  recordingId: string
  /** Recording duration in ms */
  durationMs: number
  /** Current playback time in ms */
  currentTimeMs: number
  /** List of clips */
  clips: Clip[]
  /** Whether clips are loading */
  isLoading: boolean
  /** Predefined tags from study settings */
  predefinedTags?: string[]
  /** Callback when clip is clicked (to seek player) */
  onClipClick: (startMs: number) => void
  /** Callback to create a clip */
  onCreate: (data: { startMs: number; endMs: number; title: string; description?: string; tags?: string[]; thumbnailUrl?: string }) => Promise<unknown>
  /** Callback to update a clip */
  onUpdate: (id: string, data: { title: string; description?: string; tags?: string[] }) => Promise<unknown>
  /** Callback to delete a clip */
  onDelete: (id: string) => Promise<unknown>
}

export function ClipsTab({
  recordingId: _recordingId,
  durationMs,
  currentTimeMs,
  clips,
  isLoading,
  predefinedTags,
  onClipClick,
  onCreate,
  onUpdate,
  onDelete,
}: ClipsTabProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    startMs: 0,
    endMs: 10000, // Default 10 seconds
    title: '',
    description: '',
    tags: [] as string[],
  })
  const [editingClipId, setEditingClipId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', tags: [] as string[] })
  const [deletingClipId, setDeletingClipId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Use study-defined tags or fallback to defaults
  const availableTags = predefinedTags || (DEFAULT_CLIP_TAGS as unknown as string[])

  // Start creating a new clip at current playback position
  const handleStartCreate = useCallback(() => {
    setCreateForm({
      startMs: currentTimeMs,
      endMs: Math.min(currentTimeMs + 10000, durationMs),
      title: '',
      description: '',
      tags: [],
    })
    setIsCreating(true)
  }, [currentTimeMs, durationMs])

  const handleCreate = useCallback(async () => {
    if (!createForm.title.trim()) {
      toast.error('Please enter a title for the clip')
      return
    }
    if (createForm.endMs <= createForm.startMs) {
      toast.error('End time must be after start time')
      return
    }

    setIsSaving(true)
    try {
      await onCreate({
        startMs: createForm.startMs,
        endMs: createForm.endMs,
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        tags: createForm.tags.length > 0 ? createForm.tags : undefined,
      })
      setIsCreating(false)
      setCreateForm({ startMs: 0, endMs: 10000, title: '', description: '', tags: [] })
      toast.success('Clip created')
    } catch (error) {
      toast.error('Failed to create clip', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSaving(false)
    }
  }, [createForm, onCreate])

  const handleStartEdit = useCallback((clip: Clip) => {
    setEditingClipId(clip.id)
    setEditForm({ title: clip.title, description: clip.description || '', tags: clip.tags || [] })
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingClipId || !editForm.title.trim()) return

    setIsSaving(true)
    try {
      await onUpdate(editingClipId, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        tags: editForm.tags,
      })
      setEditingClipId(null)
      toast.success('Clip updated')
    } catch (error) {
      toast.error('Failed to update clip', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSaving(false)
    }
  }, [editingClipId, editForm, onUpdate])

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingClipId) return

    setIsSaving(true)
    try {
      await onDelete(deletingClipId)
      setDeletingClipId(null)
      toast.success('Clip deleted')
    } catch (error) {
      toast.error('Failed to delete clip', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSaving(false)
    }
  }, [deletingClipId, onDelete])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - fixed */}
      <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0 bg-background">
        <h3 className="font-medium flex items-center gap-2">
          <Scissors className="h-4 w-4" />
          Clips ({clips.length})
        </h3>
        <Button size="sm" onClick={handleStartCreate} disabled={isCreating} variant="default">
          <Plus className="h-4 w-4 mr-1" />
          New Clip
        </Button>
      </div>

      {/* Create form */}
      {isCreating && (
        <div className="p-4 border-b bg-muted/30 flex-shrink-0 max-h-[50%] overflow-y-auto">
          <div className="space-y-4">
            {/* Visual range selector */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Clip Range</label>
              <ClipRangeSelector
                durationMs={durationMs}
                startMs={createForm.startMs}
                endMs={createForm.endMs}
                onChange={({ startMs, endMs }) =>
                  setCreateForm(f => ({ ...f, startMs, endMs }))
                }
                minDurationMs={1000}
              />
            </div>

            {/* Title input */}
            <Input
              placeholder="Clip title *"
              value={createForm.title}
              onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))}
            />

            {/* Description */}
            <Textarea
              placeholder="Description (optional)"
              value={createForm.description}
              onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
            />

            {/* Tags */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Tags</label>
              <TagSelector
                selectedTags={createForm.tags}
                onTagsChange={(tags) => setCreateForm(f => ({ ...f, tags }))}
                predefinedTags={availableTags}
                layout="inline"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={isSaving || !createForm.title.trim()}>
                {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Create Clip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clips list */}
      <ScrollArea className="flex-1">
        {clips.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground" style={{ minHeight: 'auto' }}>
            <Scissors className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No clips yet</p>
            <p className="text-sm">Create clips to highlight key moments</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {clips.map((clip) => (
              <div
                key={clip.id}
                className={cn(
                  'p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
                  currentTimeMs >= clip.start_ms && currentTimeMs <= clip.end_ms && 'ring-2 ring-primary'
                )}
              >
                {editingClipId === clip.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Clip title"
                    />
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Description"
                      rows={2}
                    />
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Tags</label>
                      <TagSelector
                        selectedTags={editForm.tags}
                        onTagsChange={(tags) => setEditForm(f => ({ ...f, tags }))}
                        predefinedTags={availableTags}
                        layout="inline"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setEditingClipId(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                        {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{clip.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(clip.start_ms)} - {formatDuration(clip.end_ms)}
                        </p>
                        {clip.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {clip.description}
                          </p>
                        )}
                        {/* Tags display */}
                        {clip.tags && clip.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {clip.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs py-0 px-1.5">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onClipClick(clip.start_ms)}
                          title="Play clip"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleStartEdit(clip)}
                          title="Edit clip"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeletingClipId(clip.id)}
                          title="Delete clip"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingClipId} onOpenChange={() => setDeletingClipId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clip?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The clip will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/**
 * Parse a duration string like "1:23" or "1:23:45" into milliseconds
 */
function _parseDuration(str: string): number {
  const parts = str.split(':').map(p => parseInt(p, 10))
  if (parts.some(isNaN)) return NaN

  if (parts.length === 2) {
    // mm:ss
    return (parts[0] * 60 + parts[1]) * 1000
  } else if (parts.length === 3) {
    // hh:mm:ss
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000
  }
  return NaN
}
