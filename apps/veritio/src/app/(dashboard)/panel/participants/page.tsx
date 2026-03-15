import { Suspense } from 'react'
import { ParticipantsPageContent } from './participants-page-content'
import { PanelPageSkeleton } from '@/components/dashboard/skeletons'

export const dynamic = 'force-dynamic'

export default async function ParticipantsPage() {
  return (
    <Suspense fallback={<PanelPageSkeleton />}>
      <ParticipantsPageContent />
    </Suspense>
  )
}
