import { Suspense } from 'react'
import { TeamSettingsPageContent } from './team-settings-page-content'
import { TeamSettingsSkeleton } from '@/components/team-settings'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TeamSettingsPage(props: PageProps) {
  const { id: organizationId } = await props.params

  return (
    <Suspense fallback={<TeamSettingsSkeleton />}>
      <TeamSettingsPageContent organizationId={organizationId} />
    </Suspense>
  )
}
