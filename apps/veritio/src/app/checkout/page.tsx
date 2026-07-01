import { redirect } from 'next/navigation'
import { getServerUserId } from '@veritio/auth/server'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { CheckoutLauncher } from './checkout-launcher'

export const dynamic = 'force-dynamic'

const PAID = ['starter', 'pro', 'team'] as const
type Paid = (typeof PAID)[number]

/**
 * Standalone checkout page for the marketing funnel. The /subscribe bridge sends
 * signed-in users here after onboarding so they complete payment in our custom
 * checkout (same component the in-app upgrade uses), not Polar's hosted page.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; interval?: string }>
}) {
  const sp = await searchParams
  const plan = (sp.plan ?? '') as Paid
  const interval = sp.interval === 'year' ? 'year' : 'month'

  if (!PAID.includes(plan)) redirect('/settings?tab=plan-usage')

  const userId = await getServerUserId()
  if (!userId) redirect('/subscribe?plan=' + plan + '&interval=' + interval)

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
    <main className="bg-app-background flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/favicon-black.png" alt="Veritio" className="h-11 w-11 rounded-xl opacity-90" />
      <p className="text-sm text-muted-foreground">Completing your subscription…</p>
      <CheckoutLauncher orgId={orgId} plan={plan} interval={interval} />
    </main>
  )
}
