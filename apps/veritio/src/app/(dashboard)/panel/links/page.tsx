import { Suspense } from 'react'
import { LinksPageContent } from './links-page-content'
import { PanelPageSkeleton } from '@/components/dashboard/skeletons'

export const dynamic = 'force-dynamic'

export default async function LinksPage() {
  return (
    <Suspense fallback={<PanelPageSkeleton />}>
      <LinksPageContent />
    </Suspense>
  )
}
