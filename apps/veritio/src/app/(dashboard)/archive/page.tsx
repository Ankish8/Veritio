import { Suspense } from 'react'
import { ArchivePageContent } from './archive-page-content'
import { HeaderSkeleton } from '@/components/dashboard/skeletons'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'

function ArchiveSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-4 border-b pb-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="space-y-3 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function ArchivePage() {
  return (
    <Suspense fallback={<ArchiveSkeleton />}>
      <ArchivePageContent />
    </Suspense>
  )
}
