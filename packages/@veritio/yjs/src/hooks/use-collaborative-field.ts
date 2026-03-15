'use client'
import { useCallback, useMemo, useRef, useEffect } from 'react'
import { useYjsOptional } from '../components/yjs-provider'
import { useCollaborativePresence } from './use-collaborative-presence'
import { getUserInitials } from '../lib/utils'

interface UseCollaborativeFieldOptions {
  locationId?: string
  isActive?: boolean
}

interface PresenceUser {
  userId: string
  name: string
  email: string
  avatarUrl?: string
  color: string
  initials: string
  typing?: boolean
}

interface UseCollaborativeFieldReturn {
  hasPresence: boolean
  isTyping: boolean
  users: PresenceUser[]
  primaryUser: PresenceUser | null
  onEnter: () => void
  onLeave: () => void
  onTyping: () => void
  wrapperProps: {
    onMouseEnter: () => void
    onMouseLeave: () => void
  }
  inputProps: {
    onFocus: () => void
    onBlur: () => void
    onKeyDown: () => void
  }
  presenceStyle: React.CSSProperties | undefined
  borderColor: string | undefined
}

export function useCollaborativeField({
  locationId,
  isActive: _isActive,
}: UseCollaborativeFieldOptions): UseCollaborativeFieldReturn {
  const yjs = useYjsOptional()
  const { usersAtLocation } = useCollaborativePresence(locationId)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Set location when entering
  const onEnter = useCallback(() => {
    if (locationId) {
      yjs?.setLocation(locationId)
    }
  }, [yjs, locationId])

  // Clear location and typing when leaving
  const onLeave = useCallback(() => {
    yjs?.setLocation(null)
    yjs?.setTyping(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }, [yjs])

  // Debounced typing indicator
  const onTyping = useCallback(() => {
    if (!yjs) return

    // Set typing to true
    yjs.setTyping(true)

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Clear typing after 1 second of no typing
    typingTimeoutRef.current = setTimeout(() => {
      yjs.setTyping(false)
      typingTimeoutRef.current = null
    }, 1000)
  }, [yjs])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Transform users to include initials
  const users: PresenceUser[] = useMemo(() => {
    return usersAtLocation.map((u) => ({
      userId: u.userId,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      color: u.color,
      initials: getUserInitials(u.name, u.email),
      typing: u.typing,
    }))
  }, [usersAtLocation])

  const primaryUser = users[0] || null
  const hasPresence = users.length > 0
  const isTyping = primaryUser?.typing ?? false

  // Presence style for border
  const presenceStyle: React.CSSProperties | undefined = hasPresence
    ? { border: `2px solid ${primaryUser!.color}` }
    : undefined

  return {
    hasPresence,
    isTyping,
    users,
    primaryUser,
    onEnter,
    onLeave,
    onTyping,
    wrapperProps: {
      onMouseEnter: onEnter,
      onMouseLeave: onLeave,
    },
    inputProps: {
      onFocus: onEnter,
      onBlur: onLeave,
      onKeyDown: onTyping,
    },
    presenceStyle,
    borderColor: primaryUser?.color,
  }
}
