/**
 * Study Page - Smart Redirect (Server Component)
 *
 * Queries study status server-side and redirects immediately:
 * - Draft → Builder (configure the study)
 * - Active/Paused/Completed → Results (view responses)
 *
 * Server-side redirect eliminates the client spinner between list and builder/results.
 */

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface StudyPageProps {
  params: Promise<{ projectId: string; studyId: string }>
}

export default async function StudyPage({ params }: StudyPageProps) {
  const { projectId, studyId } = await params
  const supabase = await createClient()

  const { data: study } = await supabase
    .from('studies')
    .select('status')
    .eq('id', studyId)
    .single()

  if (!study) notFound()

  if (study.status === 'draft' || !study.status) {
    redirect(`/projects/${projectId}/studies/${studyId}/builder`)
  } else {
    redirect(`/projects/${projectId}/studies/${studyId}/results`)
  }
}
