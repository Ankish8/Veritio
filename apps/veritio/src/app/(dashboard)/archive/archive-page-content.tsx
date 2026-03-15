/**
 * Archive server component — prefetches archived projects and studies
 * from Supabase and seeds SWR cache for instant first paint.
 */

import 'server-only'
import { getPanelContext } from '@/lib/server/panel-context'
import { ArchiveClientWrapper } from './archive-client-wrapper'
import { SWR_KEYS } from '@/lib/swr'

export async function ArchivePageContent() {
  const ctx = await getPanelContext()

  if (!ctx) {
    return <ArchiveClientWrapper swrFallback={{}} />
  }

  const { organizationId, supabase } = ctx

  // Fetch archived projects and studies in parallel
  const [projectsRes, studiesRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, description, user_id, is_archived, created_at, updated_at, studies(count)')
      .eq('organization_id', organizationId)
      .eq('is_archived', true)
      .order('updated_at', { ascending: false }),
    supabase
      .from('studies')
      .select('id, title, study_type, project_id, user_id, is_archived, created_at, updated_at, participants(count)')
      .eq('organization_id', organizationId)
      .eq('is_archived', true)
      .order('updated_at', { ascending: false }),
  ])

  const swrFallback: Record<string, unknown> = {}

  // SWR_KEYS.archivedProjects is a function — called with no args returns '/api/projects?archived=true'
  // The hook uses swrFetcherUnwrap which unwraps { data: T[] } → T[], so cache the unwrapped array
  if (!projectsRes.error && projectsRes.data) {
    swrFallback[SWR_KEYS.archivedProjects()] = projectsRes.data.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      user_id: p.user_id,
      is_archived: p.is_archived,
      created_at: p.created_at,
      updated_at: p.updated_at,
      study_count: p.studies?.[0]?.count ?? 0,
    }))
  }

  if (!studiesRes.error && studiesRes.data) {
    swrFallback[SWR_KEYS.archivedStudies] = studiesRes.data.map((s: any) => ({
      id: s.id,
      title: s.title,
      study_type: s.study_type,
      project_id: s.project_id,
      user_id: s.user_id,
      is_archived: s.is_archived,
      created_at: s.created_at,
      updated_at: s.updated_at,
      participant_count: s.participants?.[0]?.count ?? 0,
    }))
  }

  return <ArchiveClientWrapper swrFallback={swrFallback} />
}
