'use client'
import { useMemo, useCallback } from 'react'
import { useYjsOptional } from '../components/yjs-provider'

interface UserPresence {
  clientId: number
  userId: string
  name: string
  email: string
  avatarUrl?: string
  color: string
  initials: string
}

interface UseTabPresenceReturn {
  getUsersOnTab: (tabId: string) => UserPresence[]
  usersByTab: Map<string, UserPresence[]>
}
function getInitials(name: string, email: string): string {
  if (name) {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}
export function useTabPresence(): UseTabPresenceReturn {
  const yjs = useYjsOptional()

  const usersByTab = useMemo(() => {
    const map = new Map<string, UserPresence[]>()

    if (!yjs) {
      return map
    }

    // Build map of users by tab
    for (const { clientId, user, tab } of yjs.users) {
      if (!tab) continue

      const presence: UserPresence = {
        clientId,
        userId: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        color: user.color,
        initials: getInitials(user.name, user.email),
      }

      const existing = map.get(tab) || []
      existing.push(presence)
      map.set(tab, existing)
    }

    return map
  }, [yjs])

  const getUsersOnTab = useCallback(
    (tabId: string): UserPresence[] => {
      return usersByTab.get(tabId) || []
    },
    [usersByTab]
  )

  return {
    getUsersOnTab,
    usersByTab,
  }
}
