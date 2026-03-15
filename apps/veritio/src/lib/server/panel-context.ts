/**
 * Shared server-side context for panel pages.
 *
 * Extracts session, Supabase service-role client, and organization ID
 * from cookies — used by all panel server components to avoid duplicating
 * this boilerplate in every page.
 */

import 'server-only'
import { cookies } from 'next/headers'
import { getServerSession } from '@veritio/auth/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export interface PanelContext {
  userId: string
  organizationId: string
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>
}

/**
 * Returns { userId, organizationId, supabase } or null if unauthenticated.
 * Uses service-role client (bypasses RLS) — only call server-side.
 *
 * Reads the active org from the `veritio-active-org` cookie (set by the
 * collaboration store when the user switches orgs). Falls back to the
 * user's first org membership if the cookie is absent.
 */
export async function getPanelContext(): Promise<PanelContext | null> {
  const [session, supabase, cookieStore] = await Promise.all([
    getServerSession(),
    createServiceRoleClient(),
    cookies(),
  ])

  const userId = session?.user?.id
  if (!userId) return null

  // Prefer the org the user explicitly selected in the UI
  const activeOrgCookie = cookieStore.get('veritio-active-org')?.value

  let organizationId = ''

  if (activeOrgCookie) {
    // Validate that the user actually belongs to this org
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('organization_id', activeOrgCookie)
      .limit(1)
      .single()

    if (membership) {
      organizationId = membership.organization_id
    }
  }

  // Fallback: pick the first org membership
  if (!organizationId) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single()

    organizationId = membership?.organization_id || ''
  }

  return { userId, organizationId, supabase }
}
