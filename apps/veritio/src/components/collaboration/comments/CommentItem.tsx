'use client'

import { useState, memo } from 'react'
import { MoreHorizontal, Reply, Trash2, Edit2, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import type { CommentWithAuthor, MemberWithUser } from './types'
import { formatRelativeTime, getInitials, renderContentWithMentions } from './comment-utils'
import { DeliveryStatusIndicator } from './DeliveryStatusIndicator'
import { ReactionBar } from './ReactionBar'
import { CommentComposer } from './CommentComposer'
import { AttachmentList, type CommentAttachment } from './AttachmentList'

/**
 * A single comment.
 *
 * Rendered as a uniform left-aligned card for everyone, including the reader's
 * own comments. The previous right-aligned "my messages" bubble borrowed a
 * chat idiom that actively hurts here: in an async review thread what matters
 * is who said what and whether it's settled, not whether it was you. Uniform
 * rows also make a long thread scannable.
 */

interface CommentItemProps {
  comment: CommentWithAuthor
  currentUserId?: string
  onDelete: (commentId: string) => Promise<void>
  onEdit: (commentId: string, content: string) => Promise<void>
  onReply?: () => void
  onRetry?: () => void
  onDismiss?: () => void
  onToggleReaction?: (commentId: string, emoji: string) => void
  onCopyLink?: (commentId: string) => void
  isReply?: boolean
  members?: MemberWithUser[]
  /** Dim the row when its thread is resolved. */
  muted?: boolean
  /**
   * Extra controls for the hover row (the thread's Resolve/Reopen).
   * Kept inline rather than in a footer bar so a thread costs one row of
   * chrome instead of two.
   */
  actions?: React.ReactNode
  /** Small inline marker instead of a full-width banner. */
  badge?: React.ReactNode
}

export const CommentItem = memo(function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onEdit,
  onReply,
  onRetry,
  onDismiss,
  onToggleReaction,
  onCopyLink,
  isReply = false,
  members = [],
  muted = false,
  actions,
  badge,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwner = currentUserId === comment.author_user_id
  const deliveryStatus = comment._deliveryStatus
  const isFailed = deliveryStatus === 'failed'
  const isPending = deliveryStatus === 'pending'

  const handleEdit = async (content: string) => {
    setIsSaving(true)
    try {
      await onEdit(comment.id, content)
      setIsEditing(false)
    } catch {
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(comment.id)
      setConfirmDelete(false)
    } catch {
      toast.error('Failed to delete comment')
    } finally {
      setIsDeleting(false)
    }
  }

  const authorName = comment.author?.name || comment.author?.email || 'Unknown'

  return (
    <div
      className={cn(
        'group relative flex gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40',
        isPending && 'opacity-60',
        muted && 'opacity-70'
      )}
      data-comment-id={comment.id}
    >
      <Avatar className={cn('shrink-0', isReply ? 'h-6 w-6' : 'h-7 w-7')}>
        <AvatarImage src={comment.author?.image || undefined} />
        <AvatarFallback className="text-[11px]">{getInitials(authorName)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-[13px] font-medium text-foreground">{authorName}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatRelativeTime(comment.created_at)}
          </span>
          {comment.edited_at && (
            <span className="shrink-0 text-[11px] text-muted-foreground">(edited)</span>
          )}
          {badge}
          <DeliveryStatusIndicator status={deliveryStatus} />
        </div>

        {isEditing ? (
          <div className="mt-1">
            <CommentComposer
              onSubmit={handleEdit}
              isSubmitting={isSaving}
              defaultValue={comment.content}
              placeholder="Edit comment..."
              autoFocus
              compact
              members={members}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        ) : (
          <>
            {comment.content.trim().length > 0 && (
              <div className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground">
                {renderContentWithMentions(comment.content)}
              </div>
            )}
            {(comment.attachments?.length ?? 0) > 0 && (
              <AttachmentList
                attachments={comment.attachments as CommentAttachment[]}
                className="mt-1"
              />
            )}
          </>
        )}

        {/* One combined action row. Reactions that already exist stay visible;
            everything else appears on hover so a quiet thread is just text. */}
        {!isEditing && (onToggleReaction || onReply || actions) && (
          <div className="mt-0.5 flex items-center gap-1.5">
            {onToggleReaction && (
              <ReactionBar
                reactions={comment.reactions ?? []}
                currentUserId={currentUserId}
                onToggle={(emoji) => onToggleReaction(comment.id, emoji)}
              />
            )}
            {onReply && (
              <button
                type="button"
                onClick={onReply}
                className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
              >
                <Reply className="h-3 w-3" />
                Reply
              </button>
            )}
            {actions}
          </div>
        )}

        {isFailed && (
          <div className="mt-1 flex items-center gap-2 text-[11px]">
            <span className="text-destructive">Failed to send</span>
            {onRetry && (
              <button onClick={onRetry} className="text-primary underline hover:no-underline">
                Retry
              </button>
            )}
            {onDismiss && (
              <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>

      {!isEditing && !isFailed && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Comment actions"
              className="h-6 w-6 shrink-0 p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {onCopyLink && (
              <DropdownMenuItem onClick={() => onCopyLink(comment.id)}>
                <Link2 className="mr-2 h-3.5 w-3.5" />
                Copy link
              </DropdownMenuItem>
            )}
            {isOwner && (
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="mr-2 h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
            )}
            {isOwner && (
              <DropdownMenuItem
                onClick={() => setConfirmDelete(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Deletion was previously immediate on click, with no confirm and no undo. */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              {isReply
                ? 'This reply will be removed from the thread.'
                : 'This comment and its replies will be removed from the thread.'}{' '}
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})
