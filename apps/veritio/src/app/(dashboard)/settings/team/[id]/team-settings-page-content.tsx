/**
 * Team Settings Page Content - Server Component
 *
 * Fetches organization and members data directly from Supabase,
 * bypassing Motia IPC overhead. Data is passed to the client
 * via SWR fallback cache for instant rendering.
 */

import 'server-only'
import { getServerSession } from '@veritio/auth/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { TeamSettingsClientWrapper } from './team-settings-client-wrapper'
import { SWR_KEYS } from '@/lib/swr'

interface TeamSettingsPageContentProps {
  organizationId: string
}

export async function TeamSettingsPageContent({ organizationId }: TeamSettingsPageContentProps) {
  const [session, supabase] = await Promise.all([
    getServerSession(),
    createServiceRoleClient(),
  ])

  const userId = session?.user?.id
  if (!userId) {
    return <TeamSettingsClientWrapper organizationId={organizationId} swrFallback={{}} />
  }

  // Verify user has access to this organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single()

  if (!membership) {
    return <TeamSettingsClientWrapper organizationId={organizationId} swrFallback={{}} />
  }

  // Fetch organization and members in parallel
  const [orgResult, membersResult] = await Promise.all([
    supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single(),
    supabase
      .from('organization_members')
      .select('*, user:users(id, name, email, image)')
      .eq('organization_id', organizationId),
  ])

  const swrFallback: Record<string, unknown> = {}

  if (orgResult.data) {
    swrFallback[SWR_KEYS.organization(organizationId)] = orgResult.data
  }

  if (membersResult.data) {
    swrFallback[SWR_KEYS.organizationMembers(organizationId)] = membersResult.data
  }

  return (
    <TeamSettingsClientWrapper
      organizationId={organizationId}
      swrFallback={swrFallback}
    />
  )
}
