/**
 * Panel > Links server component — prefetches active/paused studies
 * from Supabase and seeds SWR cache for instant first paint.
 */

import 'server-only'
import { getPanelContext } from '@/lib/server/panel-context'
import { LinksClientWrapper } from './links-client-wrapper'

export async function LinksPageContent() {
  const ctx = await getPanelContext()

  if (!ctx) {
    return <LinksClientWrapper swrFallback={{}} />
  }

  const { organizationId, supabase } = ctx

  // Fetch active and paused studies — select share_code as code to match API response shape
  const { data: studies, error } = await supabase
    .from('studies')
    .select('id, title, share_code, status, url_slug')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'paused'])
    .order('updated_at', { ascending: false })

  const swrFallback: Record<string, unknown> = {}

  // SWR key matches the client hook: '/api/studies?status=active,paused'
  // Map share_code → code to match the API response shape expected by LinksClient
  if (!error && studies) {
    swrFallback['/api/studies?status=active,paused'] = studies.map((s: any) => ({
      id: s.id,
      title: s.title,
      code: s.share_code,
      status: s.status,
      url_slug: s.url_slug,
    }))
  }

  return <LinksClientWrapper swrFallback={swrFallback} />
}
