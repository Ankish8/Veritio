'use client'

import { memo, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Pencil, Trash2, Users, Filter, RefreshCw, MoreHorizontal, Copy } from 'lucide-react'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { toast } from '@/components/ui/sonner'
import { usePanelSegments, usePanelSegment } from '@/hooks/panel/use-panel-segments'
import { useAuthFetch } from '@/hooks/use-auth-fetch'
import { CreateSegmentDialog } from '@/components/panel/segments'
import { ParticipantStatusBadge } from '@/components/panel/participants'
import type { PanelParticipant } from '@/lib/supabase/panel-types'
import { cn } from '@/lib/utils'

interface SegmentDetailClientProps {
  segmentId: string
}

export const SegmentDetailClient = memo(function SegmentDetailClient({
  segmentId,
}: SegmentDetailClientProps) {
  const router = useRouter()
  const authFetch = useAuthFetch()
  const { segment, isLoading: segmentLoading, error, mutate: mutateSegment } = usePanelSegment(segmentId)
  const { deleteSegment, createSegment } = usePanelSegments()

  const [participants, setParticipants] = useState<PanelParticipant[]>([])
  const [participantsLoading, setParticipantsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    setParticipantsLoading(true)
    try {
      const response = await authFetch(`/api/panel/segments/${segmentId}/participants?limit=100`)
      if (response.ok) {
        const data = await response.json()
        setParticipants(data.participants || [])
        setTotal(data.total || 0)
      }
    } catch {
      // Silently handle error
    } finally {
      setParticipantsLoading(false)
    }
  }, [segmentId, authFetch])

  useEffect(() => {
    fetchParticipants()
  }, [fetchParticipants])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteSegment(segmentId)
      toast.success('Segment deleted')
      router.push('/panel/segments')
    } catch {
      toast.error('Failed to delete segment')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleDuplicate = async () => {
    if (!segment) return
    try {
      await createSegment({
        name: `${segment.name} (copy)`,
        description: segment.description,
        conditions: segment.conditions,
      })
      toast.success('Segment duplicated')
    } catch {
      toast.error('Failed to duplicate segment')
    }
  }

  if (error) {
    return (
      <>
        <Header
          leftContent={
            <Link href="/panel/segments" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Segments</span>
            </Link>
          }
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Segment not found</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This segment may have been deleted or you don&apos;t have access.
            </p>
            <Button asChild className="mt-4">
              <Link href="/panel/segments">Go back</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  if (segmentLoading || !segment) {
    return (
      <>
        <Header leftContent={<Skeleton className="h-6 w-48" />} />
        <div className="flex flex-1 flex-col gap-6 p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
          <Skeleton className="h-[400px] rounded-lg" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        leftContent={
          <Link href="/panel/segments" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Segments</span>
          </Link>
        }
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Segment Info */}
        <div>
          <h1 className="text-2xl font-bold">{segment.name}</h1>
          {segment.description && (
            <p className="text-muted-foreground mt-1">{segment.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Last updated {formatDistanceToNow(new Date(segment.updated_at), { addSuffix: true })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{segment.participant_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Participants</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-violet-100 dark:bg-violet-900/30 p-2">
                  <Filter className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{segment.conditions?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Conditions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conditions */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Conditions</h3>
          <div className="flex flex-wrap gap-2">
            {segment.conditions?.map((condition, index) => (
              <Badge key={index} variant="secondary" className="font-normal text-sm py-1 px-3">
                {formatConditionLabel(condition.field)} {formatOperatorLabel(condition.operator)} <span className="font-medium ml-1">{String(condition.value)}</span>
              </Badge>
            ))}
            {(!segment.conditions || segment.conditions.length === 0) && (
              <span className="text-sm text-muted-foreground">No conditions defined</span>
            )}
          </div>
        </div>

        {/* Participants Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Matching Participants
              {total > 0 && (
                <span className="text-muted-foreground ml-2">
                  (showing {participants.length} of {total})
                </span>
              )}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchParticipants}
              disabled={participantsLoading}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', participantsLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          <div className="rounded-xl border bg-card overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Participant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Source</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participantsLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : participants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <Users className="h-8 w-8 mx-auto text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        No participants match this segment
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  participants.map((participant, index) => {
                    const displayName = getDisplayName(participant)
                    const initials = getInitials(participant)

                    return (
                      <TableRow
                        key={participant.id}
                        className={cn(
                          'cursor-pointer hover:bg-muted/50',
                          'animate-in fade-in slide-in-from-bottom-1'
                        )}
                        style={{
                          animationDelay: `${Math.min(index * 20, 200)}ms`,
                          animationDuration: '300ms',
                          animationFillMode: 'both',
                        }}
                        onClick={() => router.push(`/panel/participants/${participant.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              {displayName && (
                                <p className="text-sm font-medium">{displayName}</p>
                              )}
                              <p className={cn('text-sm', displayName && 'text-muted-foreground')}>
                                {participant.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ParticipantStatusBadge status={participant.status} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm capitalize">{participant.source}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {participant.last_active_at
                              ? formatDistanceToNow(new Date(participant.last_active_at), { addSuffix: true })
                              : 'Never'}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <CreateSegmentDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        segment={segment}
        onSuccess={() => {
          mutateSegment()
          fetchParticipants()
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete segment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the segment &quot;{segment.name}&quot;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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

// Helper functions
function getDisplayName(participant: PanelParticipant): string | null {
  if (participant.first_name || participant.last_name) {
    return [participant.first_name, participant.last_name].filter(Boolean).join(' ')
  }
  return null
}

function getInitials(participant: PanelParticipant): string {
  const displayName = getDisplayName(participant)
  if (displayName) {
    return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return participant.email.slice(0, 2).toUpperCase()
}

function formatConditionLabel(field: string): string {
  const labels: Record<string, string> = {
    'status': 'Status',
    'source': 'Source',
    'demographics.country': 'Country',
    'demographics.age_range': 'Age',
    'demographics.gender': 'Gender',
    'demographics.industry': 'Industry',
    'demographics.job_role': 'Job Role',
    'demographics.company_size': 'Company Size',
    'demographics.language': 'Language',
    'study_count': 'Studies',
    'tags': 'Tag',
    'source_details.browser_data.browser': 'Browser',
    'source_details.browser_data.operatingSystem': 'OS',
    'source_details.browser_data.deviceType': 'Device',
    'source_details.browser_data.geoLocation.city': 'City',
    'source_details.browser_data.geoLocation.region': 'Region',
    'source_details.browser_data.geoLocation.country': 'Location',
  }
  return labels[field] || field.split('.').pop() || field
}

function formatOperatorLabel(operator: string): string {
  const operators: Record<string, string> = {
    'equals': 'is',
    'not_equals': 'is not',
    'contains': 'contains',
    'not_contains': 'does not contain',
    'greater_than': '>',
    'less_than': '<',
    'is_empty': 'is empty',
    'is_not_empty': 'has value',
  }
  return operators[operator] || operator
}
