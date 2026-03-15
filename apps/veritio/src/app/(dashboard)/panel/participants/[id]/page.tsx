import { Suspense } from 'react'
import { ParticipantProfileClient } from './participant-profile-client'
import { Header } from '@/components/dashboard/header'
import { Skeleton } from '@/components/ui/skeleton'

interface ParticipantProfilePageProps {
  params: Promise<{ id: string }>
}

/**
 * Participant Profile Page
 *
 * Server component wrapper that passes the participant ID to the client component.
 * Uses SWR for data fetching on the client side.
 */
export default async function ParticipantProfilePage({ params }: ParticipantProfilePageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ParticipantProfileClient participantId={id} />
    </Suspense>
  )
}

function ProfileSkeleton() {
  return (
    <>
      <Header leftContent={<Skeleton className="h-6 w-48" />} />
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Profile header skeleton */}
        <div className="flex items-start gap-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        {/* Tabs skeleton */}
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    </>
  )
}
