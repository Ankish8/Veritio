'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { SWR_KEYS, getAuthFetchInstance } from '@/lib/swr'
import { invalidateCache } from '@/lib/swr/cache-invalidation'
import type { OrganizationRole, OrganizationInvitation } from '@/lib/supabase/collaboration-types'

export interface InvitationWithOrg extends OrganizationInvitation {
  organization?: {
    id: string
    name: string
    slug: string
  }
  inviter?: {
    id: string
    name: string | null
    email: string
  }
}

export interface CreateInvitationInput {
  organization_id: string
  email?: string
  role?: OrganizationRole
  is_link_invitation?: boolean
  expires_in_days?: number
}

/** Hook to fetch and manage invitations for an organization. */
export function useInvitations(organizationId: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<InvitationWithOrg[]>(
    organizationId ? SWR_KEYS.organizationInvitations(organizationId) : null
  )

  const authFetch = getAuthFetchInstance()

  const createInvitation = useCallback(
    async (input: CreateInvitationInput): Promise<OrganizationInvitation & { invite_url?: string }> => {
      // Transform input to match API expected format
      const apiBody = input.is_link_invitation
        ? {
            type: 'link' as const,
            role: input.role || 'viewer',
            max_uses: null,
            expires_in_days: input.expires_in_days || 7,
          }
        : {
            type: 'email' as const,
            email: input.email!,
            role: input.role || 'viewer',
            expires_in_days: input.expires_in_days || 7,
          }

      const response = await authFetch(`/api/organizations/${input.organization_id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiBody),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create invitation')
      }

      const created = await response.json()

      // For link invitations, construct the invite URL
      if (input.is_link_invitation && created.invite_token) {
        created.invite_url = `${window.location.origin}/invite/${created.invite_token}`
      }

      await revalidate()
      return created
    },
    [authFetch, revalidate]
  )

  const revokeInvitation = useCallback(
    async (invitationId: string): Promise<void> => {
      const response = await authFetch(`/api/invitations/${invitationId}/revoke`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to revoke invitation')
      }

      await revalidate()
    },
    [authFetch, revalidate]
  )

  const resendInvitation = useCallback(
    async (invitationId: string): Promise<void> => {
      const response = await authFetch(`/api/invitations/${invitationId}/resend`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to resend invitation')
      }
    },
    [authFetch]
  )

  // Filter by status
  const pendingInvitations = data?.filter((i) => i.status === 'pending') || []
  const expiredInvitations = data?.filter((i) => i.status === 'expired') || []
  const acceptedInvitations = data?.filter((i) => i.status === 'accepted') || []

  return {
    invitations: data || [],
    pendingInvitations,
    expiredInvitations,
    acceptedInvitations,
    isLoading,
    error,
    refetch: revalidate,
    createInvitation,
    revokeInvitation,
    resendInvitation,
  }
}

/** Hook to accept an invitation. Used on the invitation acceptance page. */
export function useAcceptInvitation(invitationId: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<InvitationWithOrg>(
    invitationId ? SWR_KEYS.invitation(invitationId) : null
  )

  const authFetch = getAuthFetchInstance()

  const acceptInvitation = useCallback(async (): Promise<void> => {
    if (!invitationId) throw new Error('Invitation ID required')

    const response = await authFetch(`/api/invitations/${invitationId}/accept`, {
      method: 'POST',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to accept invitation')
    }

    // Use cache orchestrator for centralized invalidation
    await invalidateCache('invitation:accepted', { invitationId })
    await revalidate()
  }, [authFetch, invitationId, revalidate])

  return {
    invitation: data || null,
    isLoading,
    error,
    acceptInvitation,
  }
}

/** Hook to fetch pending invitations for the current user. */
export function usePendingInvitations() {
  const { data, error, isLoading, mutate: revalidate } = useSWR<InvitationWithOrg[]>(
    '/api/invitations/pending'
  )

  const authFetch = getAuthFetchInstance()

  const acceptInvitation = useCallback(
    async (invitationId: string): Promise<void> => {
      const response = await authFetch(`/api/invitations/${invitationId}/accept`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept invitation')
      }

      // Use cache orchestrator for centralized invalidation
      await invalidateCache('invitation:accepted')
      await revalidate()
    },
    [authFetch, revalidate]
  )

  const declineInvitation = useCallback(
    async (invitationId: string): Promise<void> => {
      const response = await authFetch(`/api/invitations/${invitationId}/decline`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to decline invitation')
      }

      await revalidate()
    },
    [authFetch, revalidate]
  )

  return {
    invitations: data || [],
    isLoading,
    error,
    refetch: revalidate,
    acceptInvitation,
    declineInvitation,
  }
}
