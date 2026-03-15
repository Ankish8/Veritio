'use client'

import { useState, memo } from 'react'
import { Loader2, Trash2, Reply, Edit2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import type { CommentWithAuthor } from './types'
import { formatRelativeTime, getInitials, renderContentWithMentions } from './comment-utils'
import { DeliveryStatusIndicator } from './DeliveryStatusIndicator'

interface CommentItemProps {
  comment: CommentWithAuthor
  currentUserId?: string
  onDelete: (commentId: string) => Promise<void>
  onEdit: (commentId: string, content: string) => Promise<void>
  onReply?: () => void
  onRetry?: () => void
  onDismiss?: () => void
  isReply?: boolean
  showHeader?: boolean
}

export const CommentItem = memo(function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onEdit,
  onReply,
  onRetry,
  onDismiss,
  isReply = false,
  showHeader = true,
}: CommentItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isSaving, setIsSaving] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const isOwner = currentUserId === comment.author_user_id
  const deliveryStatus = comment._deliveryStatus
  const isFailed = deliveryStatus === 'failed'
  const isPending = deliveryStatus === 'pending'

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return
    setIsRetrying(true)
    try {
      await onRetry()
    } catch {
      // Error already handled by hook
    } finally {
      setIsRetrying(false)
    }
  }

  const handleDelete = async () => {
    if (!isOwner || isDeleting) return
    setIsDeleting(true)
    try {
      await onDelete(comment.id)
    } catch {
      toast.error('Failed to delete comment')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim() || isSaving) return
    setIsSaving(true)
    try {
      await onEdit(comment.id, editContent.trim())
      setIsEditing(false)
    } catch {
      toast.error('Failed to update comment')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditContent(comment.content)
    setIsEditing(false)
  }

  if (isOwner) {
    return (
      <div className="group flex flex-col items-end gap-1">
        <div
          className={cn(
            'relative max-w-[85%] rounded-2xl rounded-br-md px-3 py-2',
            'bg-primary text-primary-foreground',
            isReply && 'bg-primary/90',
            // Failed state: dimmed bubble with dashed border
            isFailed && 'bg-primary/60 border border-dashed border-destructive/50',
            // Pending state: slightly dimmed
            isPending && 'bg-primary/80'
          )}
        >
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[50px] resize-none bg-background border-primary-foreground/30 text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
              <div className="flex items-center gap-1.5 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="h-6 px-2 text-xs text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || isSaving}
                  className="h-6 px-2 text-xs bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
                >
                  {isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {renderContentWithMentions(comment.content, true)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 px-1">
          <span className="text-[12px] text-muted-foreground">
            {formatRelativeTime(comment.created_at)}
            {comment.edited_at && ' · edited'}
          </span>

          {isOwner && (
            <DeliveryStatusIndicator
              status={deliveryStatus}
              onRetry={isFailed && onRetry ? handleRetry : undefined}
              onDismiss={isFailed && onDismiss ? onDismiss : undefined}
              isRetrying={isRetrying}
            />
          )}

          {!isEditing && !isFailed && !isPending && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReply}
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Reply className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="group flex gap-2">
      {showHeader ? (
        <Avatar className="h-7 w-7 shrink-0 mt-0.5">
          <AvatarImage src={comment.author?.image || undefined} />
          <AvatarFallback className="text-[12px] bg-primary/10 text-primary font-medium">
            {getInitials(comment.author?.name)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-7 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        {showHeader && (
          <span className="text-xs font-medium text-muted-foreground ml-1 mb-0.5 block">
            {comment.author?.name || 'Unknown'}
          </span>
        )}

        <div
          className={cn(
            'relative max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2',
            'bg-muted/70',
            isReply && 'bg-muted/50'
          )}
        >
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[50px] resize-none"
                autoFocus
              />
              <div className="flex items-center gap-1.5 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || isSaving}
                  className="h-6 px-2 text-xs"
                >
                  {isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
              {renderContentWithMentions(comment.content)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5 ml-1">
          <span className="text-[12px] text-muted-foreground">
            {formatRelativeTime(comment.created_at)}
            {comment.edited_at && ' · edited'}
          </span>
          {!isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReply}
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Reply className="h-3 w-3" />
                </Button>
              )}
              {isOwner && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
