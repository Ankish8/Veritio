import { Suspense } from 'react'
import { SegmentDetailClient } from './segment-detail-client'
import { Header } from '@/components/dashboard/header'
import { Skeleton } from '@/components/ui/skeleton'

interface SegmentDetailPageProps {
  params: Promise<{ id: string }>
}

/**
 * Segment Detail Page
 *
 * Server component wrapper that passes the segment ID to the client component.
 */
export default async function SegmentDetailPage({ params }: SegmentDetailPageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<SegmentDetailSkeleton />}>
      <SegmentDetailClient segmentId={id} />
    </Suspense>
  )
}

function SegmentDetailSkeleton() {
  return (
    <>
      <Header leftContent={<Skeleton className="h-6 w-48" />} />
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Segment info skeleton */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        {/* Conditions skeleton */}
        <Skeleton className="h-20 rounded-lg" />
        {/* Table skeleton */}
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    </>
  )
}
