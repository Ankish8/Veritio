'use client'

import { memo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MoreHorizontal, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import { ScrollableTabsList } from '@/components/ui/scrollable-tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

import { usePanelParticipant, useParticipantActions } from '@/hooks/panel'
import { ParticipantProfileTab } from '@/components/panel/participants/participant-profile-tab'
import { ParticipantStatusBadge } from '@/components/panel/participants'

import type { PanelParticipantWithDetails } from '@/lib/supabase/panel-types'

function TabLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </div>
  )
}

// Lazy-load non-default tabs to reduce initial bundle size
const ParticipantStudiesTab = dynamic(
  () => import('@/components/panel/participants/participant-studies-tab').then(mod => ({ default: mod.ParticipantStudiesTab })),
  { loading: () => <TabLoadingSkeleton /> }
)
const ParticipantIncentivesTab = dynamic(
  () => import('@/components/panel/participants/participant-incentives-tab').then(mod => ({ default: mod.ParticipantIncentivesTab })),
  { loading: () => <TabLoadingSkeleton /> }
)
const ParticipantNotesTab = dynamic(
  () => import('@/components/panel/participants/participant-notes-tab').then(mod => ({ default: mod.ParticipantNotesTab })),
  { loading: () => <TabLoadingSkeleton /> }
)
const EditParticipantDialog = dynamic(
  () => import('@/components/panel/participants/edit-participant-dialog').then(mod => ({ default: mod.EditParticipantDialog })),
  { ssr: false }
)
const EditTagsDialog = dynamic(
  () => import('@/components/panel/participants/edit-tags-dialog').then(mod => ({ default: mod.EditTagsDialog })),
  { ssr: false }
)

interface ParticipantProfileClientProps {
  participantId: string
}

type ProfileTab = 'profile' | 'studies' | 'incentives' | 'notes'

export const ParticipantProfileClient = memo(function ParticipantProfileClient({
  participantId,
}: ParticipantProfileClientProps) {
  const router = useRouter()
  const { participant, isLoading, error, mutate } = usePanelParticipant(participantId)
  const { deleteParticipant } = useParticipantActions()

  const [activeTab, setActiveTab] = useState<ProfileTab>('profile')
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showTagsDialog, setShowTagsDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteParticipant(participantId)
      toast.success('Participant deleted')
      router.push('/panel/participants')
    } catch {
      toast.error('Failed to delete participant')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <ProfileLoadingSkeleton />
  }

  if (error || !participant) {
    return (
      <>
        <Header
          leftContent={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/panel/participants">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <span className="text-lg font-semibold">Participant Not Found</span>
            </div>
          }
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">This participant doesn&apos;t exist or you don&apos;t have access.</p>
          <Button asChild>
            <Link href="/panel/participants">Back to Participants</Link>
          </Button>
        </div>
      </>
    )
  }

  const fullName = [participant.first_name, participant.last_name].filter(Boolean).join(' ') || 'Unknown'

  return (
    <>
      <Header
        leftContent={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/panel/participants">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <span className="text-lg font-semibold">{fullName}</span>
            <ParticipantStatusBadge status={participant.status} />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowEditDialog(true)}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          </div>
        }
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Participant
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Participant
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        <StatsCards participant={participant} />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProfileTab)} className="flex-1">
          <ScrollableTabsList variant="underline">
            <TabsTrigger variant="underline" value="profile">
              Profile
            </TabsTrigger>
            <TabsTrigger variant="underline" value="studies">
              Studies ({participant.study_count})
            </TabsTrigger>
            <TabsTrigger variant="underline" value="incentives">
              Incentives
            </TabsTrigger>
            <TabsTrigger variant="underline" value="notes">
              Notes
            </TabsTrigger>
          </ScrollableTabsList>

          <TabsContent value="profile" className="mt-6" style={{ contain: 'layout style' }}>
            <ParticipantProfileTab
              participant={participant}
              onEditDemographics={() => setShowEditDialog(true)}
              onEditTags={() => setShowTagsDialog(true)}
            />
          </TabsContent>

          <TabsContent value="studies" className="mt-6" style={{ contain: 'layout style' }}>
            <ParticipantStudiesTab participantId={participantId} />
          </TabsContent>

          <TabsContent value="incentives" className="mt-6" style={{ contain: 'layout style' }}>
            <ParticipantIncentivesTab participantId={participantId} />
          </TabsContent>

          <TabsContent value="notes" className="mt-6" style={{ contain: 'layout style' }}>
            <ParticipantNotesTab participantId={participantId} />
          </TabsContent>
        </Tabs>
      </div>

      <EditParticipantDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        participant={participant}
        onSuccess={() => {
          mutate()
          setShowEditDialog(false)
        }}
      />

      <EditTagsDialog
        open={showTagsDialog}
        onOpenChange={setShowTagsDialog}
        participant={participant}
        onSuccess={() => {
          mutate()
          setShowTagsDialog(false)
        }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Participant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {fullName} and all associated data including study
              participations, incentives, and notes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})

interface StatsCardsProps {
  participant: PanelParticipantWithDetails
}

const StatsCards = memo(function StatsCards({ participant }: StatsCardsProps) {
  const completedStudies = Math.round((participant.completion_rate / 100) * participant.study_count)

  const stats = [
    {
      value: `${participant.completion_rate.toFixed(0)}%`,
      label: 'Completion',
    },
    {
      value: completedStudies.toString(),
      label: `of ${participant.study_count} Studies`,
    },
    {
      value: `$${participant.total_incentives_earned.toFixed(2)}`,
      label: 'Earned',
      valueClass: 'text-green-600',
    },
    {
      value: participant.last_active_at
        ? formatDistanceToNow(new Date(participant.last_active_at), { addSuffix: false })
        : 'Never',
      label: 'Last Active',
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-8">
      {stats.map((stat, index) => (
        <div key={stat.label} className="flex items-center gap-1.5 sm:gap-2">
          <span className={cn('text-xl sm:text-2xl font-bold text-foreground', stat.valueClass)}>
            {stat.value}
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground">{stat.label}</span>
          {index < stats.length - 1 && (
            <div className="hidden sm:block h-6 w-px bg-border ml-3 sm:ml-5" />
          )}
        </div>
      ))}
    </div>
  )
})

function ProfileLoadingSkeleton() {
  return (
    <>
      <Header leftContent={<Skeleton className="h-6 w-48" />} />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center gap-6 sm:gap-8">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-32" />
        </div>
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    </>
  )
}
