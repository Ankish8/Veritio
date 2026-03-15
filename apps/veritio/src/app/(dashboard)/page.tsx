import { Suspense } from 'react'
import { DashboardPageContent } from './dashboard-page-content'
import { DashboardSkeleton } from '@/components/dashboard/skeletons'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  )
}
