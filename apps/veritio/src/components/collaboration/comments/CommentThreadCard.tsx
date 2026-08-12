'use client'

import { useState, memo } from 'react'
import { Check, CornerUpLeft, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import type { CommentThread, MemberWithUser } from './types'
import { CommentItem } from './CommentItem'
import { CommentComposer } from './CommentComposer'

/**
 * One discussion: a root comment, its replies, and whether it's settled.
 *
 * Replaces the collapsed chat-bubble grouping. Replies are always visible
 * rather than hidden behind a "3 replies" toggle — in a review thread the
 * replies are usually the answer, and hiding them meant the panel showed
 * questions without their resolutions.
 */

interface CommentThreadCardProps {
  thread: CommentThread
  currentUserId?: string
  members?: MemberWithUser[]
  onDelete: (commentId: string) => Promise<void>
  onEdit: (commentId: string, content: string) => Promise<void>
  onCreateReply: (parentId: string, content: string) => Promise<void>
  onToggleResolved: (commentId: string, resolved: boolean) => Promise<void>
  onToggleReaction?: (commentId: string, emoji: string) => void
  onCopyLink?: (commentId: string) => void
  onRetry?: (tempId: string) => Promise<void>
  onDismiss?: (tempId: string) => void
  /** Briefly highlighted when arrived at via a ?comment= permalink. */
  highlighted?: boolean
}

export const CommentThreadCard = memo(function CommentThreadCard({
  thread,
  currentUserId,
  members = [],
  onDelete,
  onEdit,
  onCreateReply,
  onToggleResolved,
  onToggleReaction,
  onCopyLink,
  onRetry,
  onDismiss,
  highlighted = false,
}: CommentThreadCardProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResolving, setIsResolving] = useState(false)

  const { parent, replies } = thread
  const isResolved = !!parent.resolved_at

  const handleReply = async (content: string) => {
    setIsSubmitting(true)
    try {
      await onCreateReply(parent.id, content)
      setIsReplying(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleResolved = async () => {
    setIsResolving(true)
    try {
      await onToggleResolved(parent.id, !isResolved)
    } catch {
      toast.error(isResolved ? 'Failed to reopen thread' : 'Failed to resolve thread')
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        isResolved ? 'border-border/60 bg-muted/20' : 'border-border bg-background',
        highlighted && 'ring-2 ring-primary ring-offset-1'
      )}
      data-thread-id={parent.id}
    >
      {isResolved && (
        <div className="flex items-center gap-1.5 border-b border-border/60 px-3 py-1 text-[11px] text-muted-foreground">
          <Check className="h-3 w-3 text-green-600" />
          Resolved
        </div>
      )}

      <div className="p-1">
        <CommentItem
          comment={parent}
          currentUserId={currentUserId}
          members={members}
          onDelete={onDelete}
          onEdit={onEdit}
          onReply={() => setIsReplying(true)}
          onToggleReaction={onToggleReaction}
          onCopyLink={onCopyLink}
          onRetry={parent._tempId && onRetry ? () => onRetry(parent._tempId!) : undefined}
          onDismiss={parent._tempId && onDismiss ? () => onDismiss(parent._tempId!) : undefined}
          muted={isResolved}
        />

        {replies.length > 0 && (
          <div className="ml-6 space-y-0.5 border-l border-border/60 pl-2">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                members={members}
                onDelete={onDelete}
                onEdit={onEdit}
                onToggleReaction={onToggleReaction}
                onCopyLink={onCopyLink}
                isReply
                muted={isResolved}
              />
            ))}
          </div>
        )}

        {isReplying && (
          <div className="ml-6 pl-2 pt-1">
            <CommentComposer
              onSubmit={handleReply}
              isSubmitting={isSubmitting}
              placeholder="Write a reply..."
              autoFocus
              compact
              members={members}
              onCancel={() => setIsReplying(false)}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border/60 px-2 py-1">
        <button
          type="button"
          onClick={() => setIsReplying(true)}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <CornerUpLeft className="h-3 w-3" />
          Reply
        </button>

        <button
          type="button"
          onClick={handleToggleResolved}
          disabled={isResolving}
          className={cn(
            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors disabled:opacity-50',
            isResolved
              ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
              : 'text-green-700 hover:bg-green-50 dark:text-green-500 dark:hover:bg-green-950/40'
          )}
        >
          {isResolved ? (
            <>
              <RotateCcw className="h-3 w-3" />
              Reopen
            </>
          ) : (
            <>
              <Check className="h-3 w-3" />
              Resolve
            </>
          )}
        </button>
      </div>
    </div>
  )
})
