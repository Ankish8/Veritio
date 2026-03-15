/**
 * Server component that prefetches widget data directly from Supabase
 * and seeds SWR cache via fallback, avoiding Motia IPC overhead.
 */

import 'server-only'
import { getServerSession } from '@veritio/auth/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { WidgetClientWithFallback } from './widget-client-wrapper'
import { getUserPreferences } from '@/services/user-preferences-service'
import type { PanelWidgetConfig } from '@/lib/supabase/panel-types'
import { nanoid } from 'nanoid'

const DEFAULT_WIDGET_CONFIG = {
  enabled: false,
  position: 'bottom-right',
  triggerType: 'time_delay',
  triggerValue: 5,
  backgroundColor: '#ffffff',
  textColor: '#1a1a1a',
  buttonColor: '#000000',
  title: 'Help us improve!',
  description: 'Share your feedback to help us improve.',
  buttonText: 'Get Started',
  captureSettings: {
    collectEmail: true,
    collectDemographics: true,
    demographicFields: ['country', 'age_range'],
  },
  frequencyCapping: {
    enabled: true,
    maxImpressions: 3,
    timeWindow: 'day',
  },
}

/** Fetch widget config from Supabase, creating defaults if needed. */
async function fetchWidgetConfig(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  userId: string,
  organizationId: string
): Promise<PanelWidgetConfig | null> {
  const query = supabase
    .from('panel_widget_configs')
    .select('*')
    .eq('user_id', userId) as any

  const { data, error } = await query
    .eq('organization_id', organizationId)
    .single()

  if (error?.code === 'PGRST116' || !data) {
    const upsertQuery = supabase
      .from('panel_widget_configs')
      .upsert(
        {
          user_id: userId,
          config: DEFAULT_WIDGET_CONFIG as any,
          default_tag_ids: [],
          embed_code_id: nanoid(12),
          organization_id: organizationId,
        } as any,
        { onConflict: 'user_id,organization_id' }
      )
      .select()
      .single()

    const { data: newConfig } = await upsertQuery
    return (newConfig as unknown as PanelWidgetConfig) || null
  }

  if (error) return null
  return data as unknown as PanelWidgetConfig
}

function generateEmbedCode(embedCodeId: string | null, baseUrl: string): string {
  if (!embedCodeId) return ''
  return `<!-- Veritio Panel Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['VeritioWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','veritio','${baseUrl}/widget/${embedCodeId}/loader.js'));
  veritio('init');
</script>
<!-- End Veritio Panel Widget -->`
}

export async function WidgetPageContent() {
  const [session, supabase] = await Promise.all([
    getServerSession(),
    createServiceRoleClient(),
  ])

  const userId = session?.user?.id
  if (!userId) {
    return <WidgetClientWithFallback studies={[]} swrFallback={{}} organizationId="" />
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .single()

  const organizationId = membership?.organization_id || ''

  const [studiesResult, widgetConfig, preferencesResult] = await Promise.all([
    supabase
      .from('studies')
      .select('id, title, status, study_type')
      .eq('user_id', userId)
      .in('status', ['active', 'paused'])
      .order('created_at', { ascending: false }),
    organizationId ? fetchWidgetConfig(supabase, userId, organizationId) : null,
    getUserPreferences(supabase as any, userId),
  ])

  const mappedStudies = (studiesResult.data || []).map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status || 'active',
    study_type: s.study_type,
  }))

  const swrFallback: Record<string, unknown> = {}

  if (organizationId && widgetConfig) {
    swrFallback[`/api/panel/widget?organizationId=${organizationId}`] = widgetConfig

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.veritio.com'
    swrFallback[`/api/panel/widget/embed-code?organizationId=${organizationId}`] = {
      embed_code: generateEmbedCode(widgetConfig.embed_code_id, baseUrl),
    }
  }

  if (preferencesResult.data) {
    swrFallback['/api/user/preferences'] = preferencesResult.data
  }

  return (
    <WidgetClientWithFallback
      studies={mappedStudies}
      swrFallback={swrFallback}
      organizationId={organizationId}
    />
  )
}
