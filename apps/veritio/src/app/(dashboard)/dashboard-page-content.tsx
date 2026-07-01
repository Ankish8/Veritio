/**
 * Dashboard server component.
 *
 * Keep the first paint cheap: the client dashboard already owns stats loading
 * through SWR, while Motia validates org membership before returning data.
 */

import 'server-only'
import { cookies } from 'next/headers'
import { getServerSession } from '@veritio/auth/server'
import { DashboardClientWrapper } from './dashboard-client-wrapper'

export async function DashboardPageContent() {
  const [session, cookieStore] = await Promise.all([
    getServerSession(),
    cookies(),
  ])
  const userName = session?.user?.name ?? null
  const organizationId = cookieStore.get('veritio-active-org')?.value ?? ''

  return (
    <DashboardClientWrapper swrFallback={{}} organizationId={organizationId} userName={userName} />
  )
}
