import { Suspense } from 'react'
import { SegmentsPageContent } from './segments-page-content'
import { PanelPageSkeleton } from '@/components/dashboard/skeletons'

export const dynamic = 'force-dynamic'

export default async function SegmentsPage() {
  return (
    <Suspense fallback={<PanelPageSkeleton />}>
      <SegmentsPageContent />
    </Suspense>
  )
}
