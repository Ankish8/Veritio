'use client'

import { useState, memo } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import type { CommentThread, MemberWithUser } from './types'
import type { CommentAttachment } from '@/hooks/use-study-comments'
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
  onCreateReply: (
    parentId: string,
    content: string,
    attachments: CommentAttachment[]
  ) => Promise<void>
  /** Enables attachment uploads in the reply composer. */
  studyId?: string
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
  studyId,
}: CommentThreadCardProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResolving, setIsResolving] = useState(false)

  const { parent, replies } = thread
  const isResolved = !!parent.resolved_at

  const handleReply = async (content: string, attachments: CommentAttachment[]) => {
    setIsSubmitting(true)
    try {
      await onCreateReply(parent.id, content, attachments)
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

  const resolveButton = (
    <button
      type="button"
      onClick={handleToggleResolved}
      disabled={isResolving}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1 py-0.5 text-[11px] transition-opacity disabled:opacity-50',
        // Resolved threads keep Reopen visible; open ones reveal it on hover so
        // a quiet thread reads as plain text.
        isResolved
          ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
          : 'text-green-700 opacity-0 hover:bg-green-50 group-hover:opacity-100 focus:opacity-100 dark:text-green-500 dark:hover:bg-green-950/40'
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
  )

  return (
    <div
      className={cn(
        'rounded-md transition-colors',
        isResolved ? 'bg-muted/30' : 'bg-transparent',
        highlighted && 'ring-2 ring-foreground/40 ring-offset-1'
      )}
      data-thread-id={parent.id}
    >
      <div>
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
          actions={resolveButton}
          badge={
            // Icon only: the word "Resolved" crowded the meta line enough to
            // truncate author names, and the Reopen control already says it.
            isResolved ? (
              <span
                title="Resolved"
                aria-label="Resolved"
                className="inline-flex shrink-0 items-center text-green-700 dark:text-green-500"
              >
                <Check className="h-3 w-3" />
              </span>
            ) : undefined
          }
        />

        {replies.length > 0 && (
          <div className="ml-7 space-y-0 border-l border-border/60 pl-1.5">
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
          <div className="ml-7 pl-1.5 pt-1">
            <CommentComposer
              onSubmit={handleReply}
              isSubmitting={isSubmitting}
              placeholder="Write a reply..."
              autoFocus
              compact
              members={members}
              studyId={studyId}
              onCancel={() => setIsReplying(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
})
