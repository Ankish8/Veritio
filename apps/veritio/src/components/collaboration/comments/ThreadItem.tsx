'use client'

import { useState, memo } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { CommentThread } from './types'
import { CommentItem } from './CommentItem'
import { CommentInput } from './CommentInput'

interface ThreadItemProps {
  thread: CommentThread
  currentUserId?: string
  onDelete: (commentId: string) => Promise<void>
  onEdit: (commentId: string, content: string) => Promise<void>
  onCreateReply: (parentId: string, content: string) => Promise<void>
  onRetry?: (tempId: string) => Promise<void>
  onDismiss?: (tempId: string) => void
  showHeader?: boolean
}

export const ThreadItem = memo(function ThreadItem({
  thread,
  currentUserId,
  onDelete,
  onEdit,
  onCreateReply,
  onRetry,
  onDismiss,
  showHeader = true,
}: ThreadItemProps) {
  const [showReplies, setShowReplies] = useState(thread.replies.length > 0)
  const [isReplying, setIsReplying] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReply = async (content: string) => {
    setIsSubmitting(true)
    try {
      await onCreateReply(thread.parent.id, content)
      setIsReplying(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <CommentItem
        comment={thread.parent}
        currentUserId={currentUserId}
        onDelete={onDelete}
        onEdit={onEdit}
        onReply={() => setIsReplying(true)}
        onRetry={thread.parent._tempId && onRetry ? () => onRetry(thread.parent._tempId!) : undefined}
        onDismiss={thread.parent._tempId && onDismiss ? () => onDismiss(thread.parent._tempId!) : undefined}
        showHeader={showHeader}
      />

      {(thread.replies.length > 0 || isReplying) && (
        <div className="ml-9 pl-3 border-l border-border/50 space-y-1.5">
          {thread.replies.length > 0 && (
            <Collapsible open={showReplies} onOpenChange={setShowReplies}>
              <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-0.5">
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform',
                    showReplies && 'rotate-180'
                  )}
                />
                {thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1.5 pt-1">
                {thread.replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    currentUserId={currentUserId}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    isReply
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {isReplying && (
            <div className="pt-1">
              <CommentInput
                onSubmit={handleReply}
                isSubmitting={isSubmitting}
                placeholder="Write a reply..."
                autoFocus
                onCancel={() => setIsReplying(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
})
