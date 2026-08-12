'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { getAuthFetchInstance } from '@/lib/swr'

/**
 * The in-app notification inbox.
 *
 * Polls rather than streams: the payload is per-user and the iii stream layer
 * has no per-group authorization (see lib/comments/stream-key.ts), so a
 * personal inbox is exactly the wrong thing to publish there. A minute is
 * plenty for something that also arrives by email.
 */
const POLL_INTERVAL_MS = 60000

export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  study_id: string | null
  metadata: Record<string, unknown> | null
  read: boolean
  created_at: string
}

interface NotificationsResponse {
  notifications: AppNotification[]
  unreadCount: number
  hasMore: boolean
}

/** Notification types that belong to the comment feature. */
export const COMMENT_NOTIFICATION_TYPES = ['comment-mention', 'comment-reply']

export function useNotifications(options?: { enabled?: boolean }) {
  const authFetch = getAuthFetchInstance()
  const enabled = options?.enabled ?? true

  const { data, error, isLoading, mutate } = useSWR<NotificationsResponse>(
    enabled ? '/api/notifications?limit=20' : null,
    async (url: string) => {
      const res = await authFetch(url)
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return res.json()
    },
    {
      refreshInterval: POLL_INTERVAL_MS,
      revalidateOnFocus: true,
      keepPreviousData: true,
    }
  )

  const markRead = useCallback(
    async (ids?: string[]) => {
      // Optimistic: the badge should drop the instant the panel is opened.
      mutate(
        (current) => {
          if (!current) return current
          const target = ids ? new Set(ids) : null
          const notifications = current.notifications.map((n) =>
            !target || target.has(n.id) ? { ...n, read: true } : n
          )
          return {
            ...current,
            notifications,
            unreadCount: notifications.filter((n) => !n.read).length,
          }
        },
        { revalidate: false }
      )

      try {
        const res = await authFetch('/api/notifications/read', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ids ? { ids } : {}),
        })
        if (!res.ok) throw new Error('Failed to mark read')
      } catch {
        // Re-sync from the server rather than guessing what stuck.
        void mutate()
      }
    },
    [authFetch, mutate]
  )

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading,
    error,
    markRead,
    refresh: mutate,
  }
}
