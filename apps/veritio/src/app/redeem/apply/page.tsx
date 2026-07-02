import { redirect } from 'next/navigation'
import { getServerUserId } from '@veritio/auth/server'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { RedeemForm } from './redeem-form'

export const dynamic = 'force-dynamic'

/**
 * Redeem a lifetime-deal code (AppSumo/GrabLTD style). Reached via the /redeem
 * bridge, which handles account-first signup + carries the code through onboarding.
 */
export default async function RedeemApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const sp = await searchParams
  const prefill = typeof sp.code === 'string' ? sp.code : ''

  const userId = await getServerUserId()
  // Bounce back through the bridge so it sets the intent cookie for the return trip.
  if (!userId) redirect(prefill ? `/redeem?code=${encodeURIComponent(prefill)}` : '/redeem')

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
    <main className="bg-app-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(150deg,#f5f1fb_0%,#ece6f6_55%,#e4ddf0_100%)] dark:hidden" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/favicon-black.png" alt="Veritio" className="mb-5 h-11 w-11 rounded-xl opacity-90" />
        <h1 className="text-xl font-semibold">Redeem your lifetime deal</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter the code from your purchase to unlock lifetime access on this workspace.
        </p>
        <RedeemForm prefill={prefill} />
      </div>
    </main>
  )
}
