'use client'

import useSWR from 'swr'
import { useCallback, useMemo, useEffect } from 'react'
import { SWR_KEYS, getAuthFetchInstance } from '@/lib/swr'
import { useCollaborationStore } from '@/stores/collaboration-store'
import type {
  Organization,
  OrganizationMember,
  OrganizationRole,
} from '@/lib/supabase/collaboration-types'
import type { UserPreferences } from '@/lib/supabase/user-preferences-types'

export interface OrganizationWithRole extends Organization {
  user_role: OrganizationRole
  member_count?: number
}

export interface MemberWithUser extends OrganizationMember {
  user?: {
    id: string
    name: string | null
    email: string
    image?: string | null
  }
}

/** Hook to fetch and manage organizations. */
export function useOrganizations() {
  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR<OrganizationWithRole[]>(
    SWR_KEYS.organizations
  )

  const authFetch = getAuthFetchInstance()

  const createOrganization = useCallback(
    async (input: { name: string; slug?: string }): Promise<Organization> => {
      const response = await authFetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create organization')
      }

      const created = await response.json()
      await revalidate()
      return created
    },
    [authFetch, revalidate]
  )

  const updateOrganization = useCallback(
    async (id: string, updates: { name?: string }): Promise<void> => {
      const response = await authFetch(`/api/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update organization')
      }

      await revalidate()
    },
    [authFetch, revalidate]
  )

  const deleteOrganization = useCallback(
    async (id: string): Promise<void> => {
      const response = await authFetch(`/api/organizations/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete organization')
      }

      await revalidate()
    },
    [authFetch, revalidate]
  )

  const personalWorkspace = data?.find((org) => org.is_personal) || null
  const teamOrganizations = data?.filter((org) => !org.is_personal) || []

  return {
    organizations: data || [],
    personalWorkspace,
    teamOrganizations,
    isLoading,
    isValidating,
    error,
    refetch: revalidate,
    createOrganization,
    updateOrganization,
    deleteOrganization,
  }
}

/** Hook to fetch a single organization by ID. */
export function useOrganization(organizationId: string | null, options?: { revalidateOnMount?: boolean }) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<Organization>(
    organizationId ? SWR_KEYS.organization(organizationId) : null,
    null,
    options?.revalidateOnMount === false ? { revalidateOnMount: false } : undefined
  )

  return {
    organization: data || null,
    isLoading,
    error,
    refetch: revalidate,
  }
}

/** Hook to fetch and manage organization members. */
export function useOrganizationMembers(organizationId: string | null, options?: { revalidateOnMount?: boolean }) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<MemberWithUser[]>(
    organizationId ? SWR_KEYS.organizationMembers(organizationId) : null,
    null,
    {
      revalidateOnFocus: true, // Refresh when tab regains focus
      revalidateOnReconnect: true, // Refresh when network reconnects
      ...(options?.revalidateOnMount === false ? { revalidateOnMount: false } : {}),
    }
  )

  const authFetch = getAuthFetchInstance()

  const addMember = useCallback(
    async (userId: string, role: OrganizationRole = 'viewer'): Promise<void> => {
      if (!organizationId) throw new Error('Organization ID required')

      const response = await authFetch(`/api/organizations/${organizationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add member')
      }

      await revalidate()
    },
    [authFetch, organizationId, revalidate]
  )

  const updateMemberRole = useCallback(
    async (userId: string, role: OrganizationRole): Promise<void> => {
      if (!organizationId) throw new Error('Organization ID required')

      // API expects user_id in path, not member record id
      const response = await authFetch(
        `/api/organizations/${organizationId}/members/${userId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update member role')
      }

      await revalidate()
    },
    [authFetch, organizationId, revalidate]
  )

  const removeMember = useCallback(
    async (memberId: string): Promise<void> => {
      if (!organizationId) throw new Error('Organization ID required')

      const response = await authFetch(
        `/api/organizations/${organizationId}/members/${memberId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove member')
      }

      await revalidate()
    },
    [authFetch, organizationId, revalidate]
  )

  const owners = data?.filter((m) => m.role === 'owner') || []
  const admins = data?.filter((m) => m.role === 'admin') || []
  const managers = data?.filter((m) => m.role === 'manager') || []
  const editors = data?.filter((m) => m.role === 'editor') || []
  const viewers = data?.filter((m) => m.role === 'viewer') || []

  return {
    members: data || [],
    owners,
    admins,
    managers,
    editors,
    viewers,
    isLoading,
    error,
    refetch: revalidate,
    addMember,
    updateMemberRole,
    removeMember,
  }
}

/** Hook to get and set the current organization context. Auto-validates accessibility and falls back to personal workspace. */
export function useCurrentOrganization() {
  const { organizations, isLoading, isValidating, error } = useOrganizations()
  const currentOrganization = useCollaborationStore((s) => s.isHydrated ? s.currentOrganization : null)
  const isHydrated = useCollaborationStore((s) => s.isHydrated)
  const setCurrentOrganization = useCollaborationStore((s) => s.setCurrentOrganization)
  const authFetch = getAuthFetchInstance()

  // Fetch user preferences — only when store is hydrated but has no org stored
  // (i.e., localStorage was empty — new device, private mode, or after browser clears storage)
  const shouldFetchPreferences = isHydrated && !currentOrganization && organizations.length > 0
  const { data: preferencesData } = useSWR<UserPreferences>(
    shouldFetchPreferences ? SWR_KEYS.userPreferences : null
  )

  const setCurrentOrg = useCallback(
    (org: OrganizationWithRole | null) => {
      const summary = org
        ? { id: org.id, name: org.name, slug: org.slug, is_personal: org.is_personal, user_role: org.user_role }
        : null
      setCurrentOrganization(summary)

      // Persist to DB — fire-and-forget so every device/login restores the right workspace
      authFetch(SWR_KEYS.userPreferences, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: { lastActiveOrgId: org?.id ?? null } }),
      }).catch(() => {})
    },
    [setCurrentOrganization, authFetch]
  )

  // Restore from DB when localStorage is empty (new device, cleared storage, fresh login)
  useEffect(() => {
    if (!preferencesData?.workspace?.lastActiveOrgId) return
    if (currentOrganization) return // localStorage already has a value — trust it

    const lastOrg = organizations.find((o) => o.id === preferencesData.workspace.lastActiveOrgId)
    if (lastOrg) {
      setCurrentOrganization({
        id: lastOrg.id,
        name: lastOrg.name,
        slug: lastOrg.slug,
        is_personal: lastOrg.is_personal,
        user_role: lastOrg.user_role,
      })
    }
  }, [preferencesData, organizations, currentOrganization, setCurrentOrganization])

  // When a stored org is no longer accessible (removed from team, org deleted),
  // fall back to personal workspace. Also syncs stale user_role from localStorage
  // with the fresh role from the API (e.g. after account switch or role change).
  // Uses a useEffect — not useMemo — to avoid scheduling state updates inside a
  // pure computation (React anti-pattern).
  useEffect(() => {
    // Wait for fresh data: don't run while SWR is still revalidating to avoid
    // a stale-cache false-positive that causes the personal-workspace flash.
    if (!isHydrated || isLoading || isValidating || organizations.length === 0 || !currentOrganization) return

    const freshOrg = organizations.find((o) => o.id === currentOrganization.id)
    if (!freshOrg) {
      const personal = organizations.find((o) => o.is_personal)
      if (personal) {
        setCurrentOrganization({
          id: personal.id,
          name: personal.name,
          slug: personal.slug,
          is_personal: personal.is_personal,
          user_role: personal.user_role,
        })
      }
    } else if (freshOrg.user_role !== currentOrganization.user_role) {
      // Sync stale role (e.g. different account, role changed by admin)
      setCurrentOrganization({ ...currentOrganization, user_role: freshOrg.user_role })
    }
  }, [isHydrated, isLoading, isValidating, organizations, currentOrganization, setCurrentOrganization])

  // Derive the display value. While SWR is still revalidating, trust the stored
  // org rather than potentially-stale cache data — this prevents the flash where
  // a stale org list briefly makes the current org appear invalid.
  // Also uses fresh user_role from the API to prevent stale-role permission bugs
  // (e.g. after switching accounts or after an admin changes your role).
  const validatedCurrentOrg = useMemo(() => {
    if (!currentOrganization || isLoading || isValidating || organizations.length === 0) {
      return currentOrganization
    }

    const freshOrg = organizations.find((o) => o.id === currentOrganization.id)
    if (!freshOrg) {
      // Show personal for this render cycle; the useEffect above will update the store
      return organizations.find((o) => o.is_personal) ?? currentOrganization
    }

    // Use fresh role from API to ensure correct permissions even with stale localStorage
    if (freshOrg.user_role !== currentOrganization.user_role) {
      return { ...currentOrganization, user_role: freshOrg.user_role }
    }

    return currentOrganization
  }, [currentOrganization, organizations, isLoading, isValidating])

  return {
    currentOrg: validatedCurrentOrg,
    organizations,
    isLoading,
    isHydrated,
    error,
    setCurrentOrg,
  }
}
