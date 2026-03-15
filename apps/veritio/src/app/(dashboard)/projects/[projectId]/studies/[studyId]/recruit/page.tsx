/**
 * Recruit Page - Placeholder
 *
 * This page will eventually contain participant recruitment features:
 * - Participant link generation
 * - Email invitations
 * - Participant tracking
 * - Recruitment analytics
 */

import { Suspense } from 'react'
import { getStudyMetadata, getProjectMetadata } from '@/app/(dashboard)/lib/cached-queries'
import { RecruitContent } from './recruit-content'

interface RecruitPageProps {
  params: Promise<{ projectId: string; studyId: string }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function RecruitPage({ params }: RecruitPageProps) {
  const { projectId, studyId } = await params

  const [study, project] = await Promise.all([
    getStudyMetadata(studyId),
    getProjectMetadata(projectId),
  ])

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RecruitContent
        studyId={studyId}
        projectId={projectId}
        study={study}
        project={project}
      />
    </Suspense>
  )
}
