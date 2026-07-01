import { cookies } from 'next/headers'
import { ProjectsClient } from './projects-client'

// Force dynamic rendering to ensure cookies are available for auth
export const dynamic = 'force-dynamic'

/**
 * Keep the route shell cheap. Project data is loaded by the client SWR hook so
 * navigation does not block on Motia/Supabase before rendering.
 */
export default async function ProjectsPage() {
  const cookieStore = await cookies()
  const organizationId = cookieStore.get('veritio-active-org')?.value ?? null

  return <ProjectsClient initialOrganizationId={organizationId} />
}
