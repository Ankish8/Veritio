'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { Awareness } from 'y-protocols/awareness'
import { getUserColor } from '../lib/utils'
import type { YjsUser, YjsCursor, YjsAwarenessState } from '../lib/types'

interface AwarenessUser {
  clientId: number
  user: YjsUser
  cursor?: YjsCursor
  location?: string
  typing?: boolean
  tab?: string
  isActive?: boolean
}

interface UseYjsAwarenessOptions {
  awareness: Awareness | null
  currentUser: {
    id: string
    name: string
    email: string
    avatarUrl?: string
  } | null
}

interface UseYjsAwarenessReturn {
  users: AwarenessUser[]
  updateCursor: (x: number, y: number, locationId?: string) => void
  setLocation: (locationId: string | null) => void
  setTyping: (typing: boolean) => void
  setTab: (tabId: string | null) => void
  clearState: () => void
}

export function useYjsAwareness({
  awareness,
  currentUser,
}: UseYjsAwarenessOptions): UseYjsAwarenessReturn {
  const [users, setUsers] = useState<AwarenessUser[]>([])

  // Track which awareness instance and user we've initialized for.
  // We must re-initialize when the awareness object changes (e.g., after provider reconnect
  // or React StrictMode remount), not just when the user changes.
  const initializedAwarenessRef = useRef<Awareness | null>(null)
  const previousUserIdRef = useRef<string | null>(null)

  // Set local user state when connected
  // IMPORTANT: We DON'T clear awareness on component unmount because:
  // 1. The server handles cleanup when WebSocket disconnects
  // 2. Clearing on unmount causes avatars to flicker on re-renders
  // 3. Presence should persist as long as the underlying connection exists
  useEffect(() => {
    if (!awareness || !currentUser) return

    // Re-initialize if awareness instance changed OR user changed
    if (initializedAwarenessRef.current === awareness && previousUserIdRef.current === currentUser.id) {
      return
    }

    const color = getUserColor(currentUser.id)

    awareness.setLocalStateField('user', {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      avatarUrl: currentUser.avatarUrl,
      color,
    } satisfies YjsUser)

    // Set initial active state based on current visibility
    const isVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
    awareness.setLocalStateField('isActive', isVisible)

    initializedAwarenessRef.current = awareness
    previousUserIdRef.current = currentUser.id

    // Note: We intentionally DO NOT clear awareness on cleanup.
    // The server handles removal when the WebSocket connection closes.
    // This prevents avatar flickering during component re-renders.
  }, [awareness, currentUser])

  // Track tab visibility (Page Visibility API)
  // Updates awareness when user switches tabs or minimizes window
  useEffect(() => {
    if (!awareness || typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      const isActive = document.visibilityState === 'visible'
      awareness.setLocalStateField('isActive', isActive)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [awareness])

  // Observe awareness changes
  useEffect(() => {
    if (!awareness) return

    const updateUsers = () => {
      const states = awareness.getStates()
      const userList: AwarenessUser[] = []

      states.forEach((state: YjsAwarenessState, clientId: number) => {
        // Skip current user
        if (clientId === awareness.clientID) return
        // Skip users without user info
        if (!state.user) return

        userList.push({
          clientId,
          user: state.user,
          cursor: state.cursor,
          location: state.location,
          typing: state.typing,
          tab: state.tab,
          isActive: state.isActive ?? true, // Default to active if not set
        })
      })

      setUsers(userList)
    }

    awareness.on('change', updateUsers)
    updateUsers() // Initial update

    return () => {
      awareness.off('change', updateUsers)
    }
  }, [awareness])

  // Update cursor position
  const updateCursor = useCallback(
    (x: number, y: number, locationId?: string) => {
      if (!awareness) return
      awareness.setLocalStateField('cursor', { x, y, locationId })
    },
    [awareness]
  )

  // Update current location
  const setLocation = useCallback(
    (locationId: string | null) => {
      if (!awareness) return
      if (locationId) {
        awareness.setLocalStateField('location', locationId)
      } else {
        // Remove location from state
        const currentState = awareness.getLocalState() as YjsAwarenessState
        if (currentState) {
          const { location: _location, ...rest } = currentState
          awareness.setLocalState(rest)
        }
      }
    },
    [awareness]
  )

  // Update typing status
  const setTyping = useCallback(
    (typing: boolean) => {
      if (!awareness) return
      if (typing) {
        awareness.setLocalStateField('typing', true)
      } else {
        // Remove typing from state
        const currentState = awareness.getLocalState() as YjsAwarenessState
        if (currentState) {
          const { typing: _typing, ...rest } = currentState
          awareness.setLocalState(rest)
        }
      }
    },
    [awareness]
  )

  // Update current tab
  const setTab = useCallback(
    (tabId: string | null) => {
      if (!awareness) return
      if (tabId) {
        awareness.setLocalStateField('tab', tabId)
      } else {
        // Remove tab from state
        const currentState = awareness.getLocalState() as YjsAwarenessState
        if (currentState) {
          const { tab: _tab, ...rest } = currentState
          awareness.setLocalState(rest)
        }
      }
    },
    [awareness]
  )

  // Clear all local state
  const clearState = useCallback(() => {
    if (!awareness) return
    awareness.setLocalState(null)
  }, [awareness])

  return {
    users,
    updateCursor,
    setLocation,
    setTyping,
    setTab,
    clearState,
  }
}
