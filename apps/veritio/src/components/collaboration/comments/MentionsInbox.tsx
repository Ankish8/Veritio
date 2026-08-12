'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AtSign, MessageSquareText, Loader2, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useNotifications,
  COMMENT_NOTIFICATION_TYPES,
  type AppNotification,
} from '@/hooks/use-notifications'
import { formatRelativeTime } from './comment-utils'

/**
 * "Mentions" view inside the comments panel.
 *
 * The `notifications` table has been written to since the app shipped but was
 * never read, so being @mentioned only reached you by email or by a toast that
 * required you to already be looking at that exact study. Mentioned in one
 * study while working in another produced nothing in-app at all.
 *
 * This lives inside the comments panel rather than behind a separate global
 * bell: it is comment activity, and it belongs where comments already are.
 * The trade-off is deliberate — it reaches you from any study page, but not
 * from outside a study. Mentions still arrive by email for that case.
 */

interface MentionsInboxProps {
  /** Highlights mentions belonging to the study currently being viewed. */
  currentStudyId?: string
}

function linkFor(n: AppNotification): string | null {
  const projectId = (n.metadata?.projectId as string | undefined) ?? null
  const commentId = (n.metadata?.commentId as string | undefined) ?? null

  if (n.study_id && projectId) {
    const base = `/projects/${projectId}/studies/${n.study_id}/results`
    return commentId ? `${base}?comment=${encodeURIComponent(commentId)}` : base
  }
  // Without a project id there is no valid deep link; sending someone to a
  // URL that 404s is worse than not linking.
  return null
}

export function MentionsInbox({ currentStudyId }: MentionsInboxProps) {
  const router = useRouter()
  const { notifications, isLoading, error, markRead } = useNotifications()

  const mentions = useMemo(
    () => notifications.filter((n) => COMMENT_NOTIFICATION_TYPES.includes(n.type)),
    [notifications]
  )

  const unreadIds = useMemo(
    () => mentions.filter((n) => !n.read).map((n) => n.id),
    [mentions]
  )

  /** Opening the view is the read signal — only for the mentions shown here. */
  useEffect(() => {
    if (unreadIds.length > 0) void markRead(unreadIds)
    // Mount only; later arrivals should still register as unread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading && mentions.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-destructive">Couldn&apos;t load mentions</p>
  }

  if (mentions.length === 0) {
    return (
      <div className="py-10 text-center">
        <AtSign className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No mentions yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          You&apos;ll see it here when someone @mentions you
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {mentions.some((n) => !n.read) && (
        <div className="flex justify-end px-1 pb-1">
          <button
            type="button"
            onClick={() => void markRead(mentions.filter((n) => !n.read).map((n) => n.id))}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CheckCheck className="h-3 w-3" />
            Mark all read
          </button>
        </div>
      )}

      {mentions.map((n) => {
        const Icon = n.type === 'comment-mention' ? AtSign : MessageSquareText
        const href = linkFor(n)
        const elsewhere = !!n.study_id && n.study_id !== currentStudyId

        return (
          <button
            key={n.id}
            type="button"
            onClick={() => href && router.push(href)}
            disabled={!href}
            className={cn(
              'flex w-full gap-2.5 rounded-md px-2 py-2 text-left transition-colors',
              href ? 'hover:bg-muted/60' : 'cursor-default',
              !n.read && 'bg-primary/[0.06]'
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                n.read ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    'truncate text-[13px] text-foreground',
                    !n.read && 'font-medium'
                  )}
                >
                  {n.title}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatRelativeTime(n.created_at)}
                </span>
              </span>
              <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                {n.message}
              </span>
              {/* The cross-study case is the one that used to be invisible, so
                  it's called out rather than silently blending in. */}
              {elsewhere && (
                <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground/80">
                  In another study
                </span>
              )}
            </span>

            {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
          </button>
        )
      })}
    </div>
  )
}
