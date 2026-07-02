import { redirect } from 'next/navigation'
import { getServerUserId } from '@veritio/auth/server'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { LtdCheckoutLauncher } from './ltd-checkout-launcher'

export const dynamic = 'force-dynamic'

const TIERS = ['tier1', 'tier2', 'team'] as const
type Tier = (typeof TIERS)[number]

/**
 * One-time lifetime-deal checkout page. The /ltd-checkout bridge sends signed-in
 * users here (after onboarding if needed) so they complete a one-time purchase in
 * our custom checkout, not Polar's hosted page.
 */
export default async function LtdCheckoutPayPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>
}) {
  const sp = await searchParams
  const tier = (sp.tier ?? '') as Tier

  if (!TIERS.includes(tier)) redirect('/ltd-checkout')

  const userId = await getServerUserId()
  if (!userId) redirect('/ltd-checkout?tier=' + tier)

  const supabase = getMotiaSupabaseClient()
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .limit(1)
    .maybeSingle()

  const orgId = (membership as { organization_id?: string } | null)?.organization_id
  if (!orgId) redirect('/onboarding')

  return (
    <main className="bg-app-background relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden p-6">
      {/* Lavender gradient matches the auth pages so the signup -> checkout funnel feels continuous. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(150deg,#f5f1fb_0%,#ece6f6_55%,#e4ddf0_100%)] dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/favicon-black.png" alt="Veritio" className="relative z-10 h-11 w-11 rounded-xl opacity-90" />
      <p className="relative z-10 text-sm text-muted-foreground">Completing your lifetime purchase…</p>
      <LtdCheckoutLauncher orgId={orgId} tier={tier} />
    </main>
  )
}
