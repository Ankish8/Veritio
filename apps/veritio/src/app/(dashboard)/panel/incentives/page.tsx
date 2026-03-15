import { Suspense } from 'react'
import { IncentivesPageContent } from './incentives-page-content'
import { PanelPageSkeleton } from '@/components/dashboard/skeletons'

export const dynamic = 'force-dynamic'

export default async function IncentivesPage() {
  return (
    <Suspense fallback={<PanelPageSkeleton />}>
      <IncentivesPageContent />
    </Suspense>
  )
}
