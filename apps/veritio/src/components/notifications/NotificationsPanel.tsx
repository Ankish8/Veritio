'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AtSign,
  Bell,
  CheckCheck,
  FlaskConical,
  Loader2,
  MessageSquareText,
  Package,
  Settings2,
  AlertTriangle,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useNotifications, type AppNotification } from '@/hooks/use-notifications'
import { formatRelativeTime } from '@/components/collaboration/comments/comment-utils'
import { useFloatingActionBar } from '@/components/analysis/shared/floating-action-bar/FloatingActionBarContext'

/**
 * The notification inbox.
 *
 * The `notifications` table was written to for the app's entire life and read
 * by nothing: 14 of its 16 types — exports finishing, recordings being deleted,
 * a study auto-closing, a workspace failing to set up — persisted and were
 * shown to nobody. This is the read side.
 *
 * Lives in the always-present rail rather than a study page, because most of
 * what lands here is not study-scoped.
 */

type FilterId = 'all' | 'mention' | 'study' | 'job' | 'system'

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mention', label: 'Mentions' },
  { id: 'study', label: 'Studies' },
  { id: 'job', label: 'Jobs' },
  { id: 'system', label: 'System' },
]

function iconFor(n: AppNotification) {
  if (n.type === 'comment-mention') return AtSign
  if (n.type === 'comment-reply') return MessageSquareText
  if (n.category === 'job') return Package
  if (n.category === 'study') return FlaskConical
  if (n.type.includes('failed') || n.metadata?.urgent) return AlertTriangle
  return Settings2
}

/** Where clicking a notification should land. Null means not navigable. */
function linkFor(n: AppNotification): string | null {
  const projectId = (n.metadata?.projectId as string | undefined) ?? null
  const commentId = (n.metadata?.commentId as string | undefined) ?? null

  if (n.study_id && projectId) {
    const base = `/projects/${projectId}/studies/${n.study_id}/results`
    return commentId ? `${base}?comment=${encodeURIComponent(commentId)}` : base
  }
  if (n.study_id) return '/studies'
  if (projectId) return `/projects/${projectId}`
  return null
}

export function NotificationsPanel() {
  const router = useRouter()
  const { setActivePanel } = useFloatingActionBar()
  const [filter, setFilter] = useState<FilterId>('all')

  const {
    notifications,
    unreadCount,
    unreadByCategory,
    isLoading,
    error,
    markRead,
  } = useNotifications({ category: filter === 'all' ? undefined : filter })

  const hasUnread = useMemo(() => notifications.some((n) => !n.read), [notifications])

  const open = (n: AppNotification) => {
    // Marking on click rather than on panel-open: with categories, opening the
    // inbox does not mean you have read what is hidden behind another filter.
    if (!n.read) void markRead([n.id])
    const href = linkFor(n)
    if (!href) return
    setActivePanel(null)
    router.push(href)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border px-2.5 py-1.5">
        {/* Segmented control matching the app's Tabs `default` variant —
            muted track, raised active chip. A filled brand-colour pill was an
            outlier: nothing else in the product tabs uses one. */}
        <div className="flex items-center gap-1">
          {/* Only the chip track scrolls. Putting overflow on the row instead
              pushed "Mark all read" off the end where it couldn't be reached. */}
          <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto rounded-lg bg-muted p-[3px]">
          {FILTERS.map((f) => {
            const count = f.id === 'all' ? unreadCount : (unreadByCategory[f.id] ?? 0)
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'shrink-0 rounded-md px-2 py-0.5 text-[12px] font-medium transition-all',
                  filter === f.id ? 'bg-background text-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground'
                )}
              >
                {f.label}
                {count > 0 && <span className="ml-1 tabular-nums opacity-80">{count}</span>}
              </button>
            )
          })}
          </div>

          {hasUnread && (
            <button
              type="button"
              onClick={() => void markRead()}
              title="Mark all read"
              aria-label="Mark all read"
              className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-0.5 p-1.5">
          {isLoading && notifications.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">
              Couldn&apos;t load notifications
            </p>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {filter === 'all' ? 'No notifications yet' : 'Nothing here'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                You&apos;ll be told here about mentions, exports and study activity
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = iconFor(n)
              const href = linkFor(n)
              const count = Number(n.metadata?.count ?? 0)

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => open(n)}
                  className={cn(
                    'flex w-full gap-2.5 rounded-md px-2 py-2 text-left transition-colors',
                    href ? 'hover:bg-muted/60' : 'cursor-default',
                    !n.read && 'bg-muted/50'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      n.read ? 'bg-muted text-muted-foreground' : 'bg-foreground/10 text-foreground'
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
                    {/* Grouped rows say how many events they stand for, so a
                        single line doesn't hide a burst of activity. */}
                    {count > 1 && (
                      <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground/80">
                        {count} updates
                      </span>
                    )}
                  </span>

                  {!n.read && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
