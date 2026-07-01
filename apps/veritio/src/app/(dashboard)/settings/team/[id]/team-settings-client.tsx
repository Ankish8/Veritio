'use client'

/**
 * Team Settings Client
 *
 * Organization settings for managing team members, roles, and general settings.
 * Extracted from page.tsx to support server-side data prefetching.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from '@veritio/auth/client'
import { useCurrentOrganization, useOrganization, useOrganizationMembers } from '@/hooks/use-organizations'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { computeEntitlements, type OrgPlanRow } from '@/lib/plans'
import {
  TeamSettingsShell,
  TeamSettingsSkeleton,
  getTeamSettingsTabs,
  MembersTab,
  GeneralTab,
  type TeamSettingsTabId,
} from '@/components/team-settings'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { ROLE_LEVELS, type OrganizationRole } from '@/lib/supabase/collaboration-types'

interface TeamSettingsClientProps {
  organizationId: string
  serverPrefetched?: boolean
}

export function TeamSettingsClient({ organizationId, serverPrefetched }: TeamSettingsClientProps) {
  const { data: session, isPending: sessionPending } = useSession()
  const [activeTab, setActiveTab] = useState<TeamSettingsTabId>('members')
  const { currentOrg, isHydrated, setCurrentOrg } = useCurrentOrganization()

  const revalidateOpts = serverPrefetched ? { revalidateOnMount: false } : undefined
  const { organization, isLoading: orgLoading, error: orgError } = useOrganization(organizationId, revalidateOpts)
  const { members } = useOrganizationMembers(organizationId, revalidateOpts)

  // Compute permissions from actual member data
  const currentUserMember = members.find(
    (m) => m.user_id === session?.user?.id || m.user?.email === session?.user?.email
  )
  const currentUserRole = currentUserMember?.role as OrganizationRole | undefined

  const hasRoleOrHigher = (requiredRole: OrganizationRole): boolean => {
    if (!currentUserRole) return false
    return ROLE_LEVELS[currentUserRole] >= ROLE_LEVELS[requiredRole]
  }

  // Check permissions (admin+ can manage, owner can delete)
  const canManage = hasRoleOrHigher('admin')
  const canDelete = hasRoleOrHigher('owner')
  const planRow = {
    plan: ((organization as unknown as Partial<OrgPlanRow>)?.plan ?? 'starter') as OrgPlanRow['plan'],
    plan_status: ((organization as unknown as Partial<OrgPlanRow>)?.plan_status ?? 'active') as OrgPlanRow['plan_status'],
    trial_ends_at: (organization as unknown as Partial<OrgPlanRow>)?.trial_ends_at ?? null,
    extra_seats: (organization as unknown as Partial<OrgPlanRow>)?.extra_seats ?? 0,
  }
  const seatLimit = computeEntitlements(planRow).seats

  useEffect(() => {
    if (!isHydrated || !organization || !currentUserRole) return

    const routeOrgMatchesCurrent =
      currentOrg?.id === organization.id &&
      currentOrg.name === organization.name &&
      currentOrg.slug === organization.slug &&
      currentOrg.is_personal === organization.is_personal &&
      currentOrg.user_role === currentUserRole

    if (routeOrgMatchesCurrent) return

    setCurrentOrg({
      ...organization,
      user_role: currentUserRole,
    })
  }, [currentOrg, currentUserRole, isHydrated, organization, setCurrentOrg])

  // Loading state - show skeleton while checking auth or loading org
  if (sessionPending || orgLoading) {
    return <TeamSettingsSkeleton />
  }

  // Error state
  if (orgError || !organization) {
    return (
      <div className="flex flex-1 flex-col min-h-0">
        <Header
          leftContent={
            <Link
              href="/"
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          }
          title="Team Settings"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold">Organization not found</h2>
            <p className="text-muted-foreground mt-1">
              The organization you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
            </p>
            <Button asChild className="mt-4">
              <Link href="/">Go to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const tabs = getTeamSettingsTabs({
    members: (
      <MembersTab
        organizationId={organizationId}
        organizationName={organization.name}
        currentUserId={session?.user?.id || ''}
        currentUserRole={currentUserRole || 'viewer'}
        canManage={canManage}
        memberCount={members.length}
        seatLimit={seatLimit}
      />
    ),
    general: (
      <GeneralTab
        organizationId={organizationId}
        organization={organization}
        canManage={canManage}
        canDelete={canDelete}
      />
    ),
  })

  return (
    <TeamSettingsShell
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  )
}
