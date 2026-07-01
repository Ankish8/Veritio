import { ProjectDetailClient } from './project-detail-client'

// Force dynamic rendering to ensure cookies are available for auth
export const dynamic = 'force-dynamic'

interface ProjectPageProps {
  params: Promise<{ projectId: string }>
}

/**
 * Keep project navigation responsive. The project card seeds the SWR cache on
 * hover/click, and direct refreshes load data through client SWR.
 */
export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params

  return <ProjectDetailClient projectId={projectId} />
}
