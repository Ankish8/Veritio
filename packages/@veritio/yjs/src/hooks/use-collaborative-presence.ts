'use client'
import { useMemo } from 'react'
import { useYjsOptional } from '../components/yjs-provider'

interface UserPresence {
  clientId: number
  userId: string
  name: string
  email: string
  avatarUrl?: string
  color: string
  typing?: boolean
}

interface UseCollaborativePresenceReturn {
  usersAtLocation: UserPresence[]
  isLocationOccupied: boolean
  primaryUser: UserPresence | null
  usersByLocation: Map<string, UserPresence[]>
}
export function useCollaborativePresence(
  locationId?: string
): UseCollaborativePresenceReturn {
  const yjs = useYjsOptional()

  const result = useMemo(() => {
    const usersByLocation = new Map<string, UserPresence[]>()
    const usersAtLocation: UserPresence[] = []

    if (!yjs) {
      return {
        usersAtLocation,
        isLocationOccupied: false,
        primaryUser: null,
        usersByLocation,
      }
    }

    // Build map of users by location
    for (const { clientId, user, location, typing } of yjs.users) {
      if (!location) continue

      const presence: UserPresence = {
        clientId,
        userId: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        color: user.color,
        typing,
      }

      const existing = usersByLocation.get(location) || []
      existing.push(presence)
      usersByLocation.set(location, existing)

      // Track users at the specific location we're interested in
      if (locationId && location === locationId) {
        usersAtLocation.push(presence)
      }
    }

    return {
      usersAtLocation,
      isLocationOccupied: usersAtLocation.length > 0,
      primaryUser: usersAtLocation[0] || null,
      usersByLocation,
    }
  }, [yjs, locationId])

  return result
}
export function useAllCollaborativePresence() {
  return useCollaborativePresence().usersByLocation
}
