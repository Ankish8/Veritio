import { redirect } from 'next/navigation'
import { getServerUserId } from '@veritio/auth/server'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { LtdCheckoutLauncher } from './ltd-checkout-launcher'

export const dynamic = 'force-dynamic'

const TIERS = ['tier1', 'tier2', 'team'] as const
type Tier = (typeof TIERS)[number]

/**
 * One-time lifetime-deal checkout page. Payment-first: opens our custom
 * checkout immediately for anonymous buyers (account creation happens after
 * payment via the activation code / email). Signed-in owners with an org get
 * the org-scoped checkout so their plan applies instantly.
 */
export default async function LtdCheckoutPayPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; embed?: string }>
}) {
  const sp = await searchParams
  const tier = (sp.tier ?? '') as Tier
  // Embed mode: rendered inside a transparent iframe overlay on the /ltd landing
  // page, so the checkout appears as a modal on that page with no navigation.
  const embed = sp.embed === '1'

  if (!TIERS.includes(tier)) redirect('/ltd')

  // Optional session: signed-in owners buy for their org; everyone else buys
  // anonymously and claims the purchase after payment.
  let orgId: string | null = null
  const userId = await getServerUserId().catch(() => null)
  if (userId) {
    const supabase = getMotiaSupabaseClient()
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId)
      .not('joined_at', 'is', null)
      .limit(1)
      .maybeSingle()
    const m = membership as { organization_id?: string; role?: string } | null
    if (m?.organization_id && ['owner', 'admin'].includes(m.role ?? '')) {
      orgId = m.organization_id
    }
  }

  if (embed) {
    // Transparent shell: the landing page shows through the iframe, so the
    // dialog inside reads as a modal opened on /ltd itself.
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: 'html,body{background:transparent !important}' }} />
        <LtdCheckoutLauncher orgId={orgId} tier={tier} embed />
      </main>
    )
  }

  return (
    <main className="bg-app-background relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden p-6">
      {/* Lavender gradient matches the auth pages so the funnel feels continuous. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(150deg,#f5f1fb_0%,#ece6f6_55%,#e4ddf0_100%)] dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/favicon-black.png" alt="Veritio" className="relative z-10 h-11 w-11 rounded-xl opacity-90" />
      <LtdCheckoutLauncher orgId={orgId} tier={tier} />
    </main>
  )
}
