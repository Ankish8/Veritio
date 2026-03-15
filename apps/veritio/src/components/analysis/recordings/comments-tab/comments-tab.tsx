'use client'

/**
 * CommentsTab Component
 *
 * Displays and manages recording comments/annotations.
 * Supports both timestamped comments (linked to specific moments) and general notes.
 */

import { useState, useCallback, useRef } from 'react'
import { MessageSquare, Clock, Send, Pencil, Trash2, Loader2, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

export interface Comment {
  id: string
  recording_id: string
  clip_id: string | null
  timestamp_ms: number | null
  content: string
  author_id: string
  author_name: string | null
  author_email: string | null
  author_image: string | null
  created_at: string
  updated_at: string
}

interface CommentsTabProps {
  /** Recording ID */
  recordingId: string
  /** Current playback time in ms */
  currentTimeMs: number
  /** List of comments */
  comments: Comment[]
  /** Whether comments are loading */
  isLoading: boolean
  /** Current user ID (for edit/delete permissions) */
  currentUserId: string
  /** Map of clip ID to clip title for displaying clip badges */
  clipNames?: Record<string, string>
  /** Callback when timestamp is clicked (to seek player) */
  onTimestampClick: (timestampMs: number) => void
  /** Callback to create a comment */
  onCreate: (data: { content: string; timestampMs?: number }) => Promise<unknown>
  /** Callback to update a comment */
  onUpdate: (id: string, content: string) => Promise<unknown>
  /** Callback to delete a comment */
  onDelete: (id: string) => Promise<unknown>
}

export function CommentsTab({
  recordingId: _recordingId,
  currentTimeMs,
  comments,
  isLoading,
  currentUserId,
  clipNames,
  onTimestampClick,
  onCreate,
  onUpdate,
  onDelete,
}: CommentsTabProps) {
  const [newComment, setNewComment] = useState('')
  const [linkToTimestamp, setLinkToTimestamp] = useState(true)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sort comments: timestamped first (by timestamp), then general notes (by created_at)
  const sortedComments = [...comments].sort((a, b) => {
    if (a.timestamp_ms !== null && b.timestamp_ms !== null) {
      return a.timestamp_ms - b.timestamp_ms
    }
    if (a.timestamp_ms !== null) return -1
    if (b.timestamp_ms !== null) return 1
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  const handleSubmit = useCallback(async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      await onCreate({
        content: newComment.trim(),
        timestampMs: linkToTimestamp ? currentTimeMs : undefined,
      })
      setNewComment('')
    } catch (error) {
      toast.error('Failed to add comment', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [newComment, linkToTimestamp, currentTimeMs, onCreate])

  const handleStartEdit = useCallback((comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditContent(comment.content)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingCommentId || !editContent.trim()) return

    setIsSubmitting(true)
    try {
      await onUpdate(editingCommentId, editContent.trim())
      setEditingCommentId(null)
    } catch (error) {
      toast.error('Failed to update comment', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [editingCommentId, editContent, onUpdate])

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingCommentId) return

    setIsSubmitting(true)
    try {
      await onDelete(deletingCommentId)
      setDeletingCommentId(null)
    } catch (error) {
      toast.error('Failed to delete comment', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [deletingCommentId, onDelete])

  // Handle keyboard shortcut
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h3 className="font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Comments ({comments.length})
        </h3>
      </div>

      {/* Comments list */}
      <ScrollArea className="flex-1">
        {sortedComments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No comments yet</p>
            <p className="text-sm">Add annotations or notes to this recording</p>
          </div>
        ) : (
          <div className="p-2 space-y-3">
            {sortedComments.map((comment) => {
              const isOwner = comment.author_id === currentUserId
              const initials = comment.author_name
                ? comment.author_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : comment.author_email?.slice(0, 2).toUpperCase() || '??'

              return (
                <div
                  key={comment.id}
                  className={cn(
                    'p-3 rounded-lg border bg-card',
                    comment.timestamp_ms !== null &&
                      currentTimeMs >= comment.timestamp_ms &&
                      currentTimeMs <= comment.timestamp_ms + 3000 &&
                      'bg-primary/5 border-primary/30'
                  )}
                >
                  {editingCommentId === comment.id ? (
                    // Edit mode
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setEditingCommentId(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit} disabled={isSubmitting}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-start gap-3">
                        <Avatar className="h-7 w-7">
                          {comment.author_image && <AvatarImage src={comment.author_image} alt={comment.author_name || ''} />}
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {comment.author_name || comment.author_email || 'Unknown'}
                            </span>
                            {comment.timestamp_ms !== null && (
                              <button
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                onClick={() => onTimestampClick(comment.timestamp_ms!)}
                              >
                                <Clock className="h-3 w-3" />
                                {formatDuration(comment.timestamp_ms)}
                              </button>
                            )}
                          </div>
                          {comment.clip_id && clipNames?.[comment.clip_id] && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-1 w-fit">
                              <Scissors className="h-3 w-3" />
                              {clipNames[comment.clip_id]}
                            </span>
                          )}
                          <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(comment.created_at).toLocaleString()}
                          </p>
                        </div>
                        {isOwner && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleStartEdit(comment)}
                              title="Edit comment"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeletingCommentId(comment.id)}
                              title="Delete comment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* New comment form */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <Switch
            id="link-timestamp"
            checked={linkToTimestamp}
            onCheckedChange={setLinkToTimestamp}
          />
          <Label htmlFor="link-timestamp" className="text-xs">
            Link to current time ({formatDuration(currentTimeMs)})
          </Label>
        </div>
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="resize-none pr-10"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
            className="absolute right-1 bottom-1 h-7 w-7"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Press ⌘+Enter to submit
        </p>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingCommentId} onOpenChange={() => setDeletingCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The comment will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
