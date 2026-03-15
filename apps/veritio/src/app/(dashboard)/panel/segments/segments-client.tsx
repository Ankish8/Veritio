'use client'

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Badge } from '@/components/ui/badge'
import { Plus, Filter, Users, MoreHorizontal, Pencil, Copy, Trash2, ChevronRight } from 'lucide-react'

const CreateSegmentDialog = dynamic(
  () => import('@/components/panel/segments').then(m => ({ default: m.CreateSegmentDialog })),
  { ssr: false }
)
import { usePanelSegments } from '@/hooks/panel/use-panel-segments'
import { toast } from '@/components/ui/sonner'
import type { PanelSegment } from '@/lib/supabase/panel-types'
import { cn } from '@/lib/utils'

interface SegmentsClientProps {
  organizationId?: string
}

export function SegmentsClient({ organizationId }: SegmentsClientProps) {
  const router = useRouter()
  const { segments, isLoading, deleteSegment, createSegment, mutate } = usePanelSegments(organizationId)

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingSegment, setEditingSegment] = useState<PanelSegment | null>(null)

  // Total participants across all segments
  const totalParticipants = useMemo(() => {
    return segments.reduce((sum, s) => sum + (s.participant_count || 0), 0)
  }, [segments])

  const handleEdit = useCallback((segment: PanelSegment, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingSegment(segment)
    setShowCreateDialog(true)
  }, [])

  const handleDuplicate = useCallback(async (segment: PanelSegment, e?: React.MouseEvent) => {
    e?.stopPropagation()
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
  }, [createSegment])

  const handleDelete = useCallback(
    async (segment: PanelSegment, e?: React.MouseEvent) => {
      e?.stopPropagation()
      if (!confirm(`Delete segment "${segment.name}"?`)) return

      try {
        await deleteSegment(segment.id)
        toast.success('Segment deleted')
      } catch {
        toast.error('Failed to delete segment')
      }
    },
    [deleteSegment]
  )

  const handleCreate = useCallback(() => {
    setEditingSegment(null)
    setShowCreateDialog(true)
  }, [])

  const handleViewSegment = useCallback((segment: PanelSegment) => {
    router.push(`/panel/segments/${segment.id}`)
  }, [router])

  // Format condition for display
  const formatConditionSummary = (conditions: PanelSegment['conditions']) => {
    if (!conditions || conditions.length === 0) return 'No conditions'
    if (conditions.length === 1) {
      const c = conditions[0]
      return `${formatFieldLabel(c.field)} ${formatOperator(c.operator)} ${c.value}`
    }
    return `${conditions.length} conditions`
  }

  return (
    <>
      <Header title="Segments">
        <Button size="sm" className="gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          New Segment
        </Button>
      </Header>

      <div className="flex flex-1 flex-col gap-4 p-6">
        {/* Stats Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <span className="text-sm font-medium">
                  {segments.length} {segments.length === 1 ? 'segment' : 'segments'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {isLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <span className="text-sm text-muted-foreground">
                  {totalParticipants} total participants matched
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Empty State */}
        {!isLoading && segments.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-12 text-center bg-card/50">
            <Filter className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="font-semibold text-foreground mt-4">No segments yet</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Create segments to dynamically filter participants based on demographics, browser data, location, and activity.
            </p>
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Segment
            </Button>
          </div>
        )}

        {/* Table */}
        {(segments.length > 0 || isLoading) && (
          <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Conditions</TableHead>
                  <TableHead className="text-right">Participants</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Updated</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  segments.map((segment, index) => (
                    <TableRow
                      key={segment.id}
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:bg-muted/50',
                        'animate-in fade-in slide-in-from-bottom-2'
                      )}
                      style={{
                        animationDelay: `${Math.min(index * 30, 300)}ms`,
                        animationDuration: '400ms',
                        animationFillMode: 'both',
                      }}
                      onClick={() => handleViewSegment(segment)}
                    >
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{segment.name}</span>
                          {segment.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {segment.description}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-normal">
                            {segment.conditions?.length || 0} {(segment.conditions?.length || 0) === 1 ? 'condition' : 'conditions'}
                          </Badge>
                          <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {formatConditionSummary(segment.conditions)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-medium text-primary">
                            {segment.participant_count || 0}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(segment.updated_at), { addSuffix: true })}
                        </span>
                      </TableCell>

                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleEdit(segment, e as any)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleDuplicate(segment, e as any)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => handleDelete(segment, e as any)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create/Edit Segment Dialog */}
      <CreateSegmentDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) setEditingSegment(null)
        }}
        segment={editingSegment}
        onSuccess={() => mutate()}
      />
    </>
  )
}

// Helper functions
function formatFieldLabel(field: string): string {
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

function formatOperator(operator: string): string {
  const operators: Record<string, string> = {
    'equals': '=',
    'not_equals': '≠',
    'contains': '~',
    'not_contains': '!~',
    'greater_than': '>',
    'less_than': '<',
    'is_empty': 'empty',
    'is_not_empty': 'has value',
  }
  return operators[operator] || operator
}
