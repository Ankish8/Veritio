'use client'

import { memo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { ParticipantStatusBadge } from './participant-status-badge'
import { ParticipantSourceBadge } from './participant-source-badge'
import { MoreHorizontal, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { PanelParticipantWithTags } from '@/lib/supabase/panel-types'

function getDisplayName(participant: PanelParticipantWithTags): string | null {
  if (participant.first_name || participant.last_name) {
    return [participant.first_name, participant.last_name].filter(Boolean).join(' ')
  }
  return null
}

interface ParticipantsTableProps {
  participants: PanelParticipantWithTags[]
  selectedIds: Set<string>
  onSelectId: (id: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onViewDetails: (participant: PanelParticipantWithTags) => void
  onPrefetch?: (participant: PanelParticipantWithTags) => void
  onEdit: (participant: PanelParticipantWithTags) => void
  onDelete: (participant: PanelParticipantWithTags) => void
  isLoading?: boolean
}

export const ParticipantsTable = memo(function ParticipantsTable({
  participants,
  selectedIds,
  onSelectId,
  onSelectAll,
  onViewDetails,
  onPrefetch,
  onEdit,
  onDelete,
  isLoading,
}: ParticipantsTableProps) {
  const allSelected = participants.length > 0 && participants.every((p) => selectedIds.has(p.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="animate-pulse space-y-4 p-8">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (participants.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-12 text-center bg-card/50">
        <User className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <h3 className="font-semibold text-foreground mt-4">No participants yet</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Get started by adding participants manually, importing from CSV, or capturing them via
          your website widget.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-card overflow-x-auto">
      <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead sortable={false} className="w-12">
              <Checkbox
                checked={someSelected ? 'indeterminate' : allSelected}
                onCheckedChange={(checked) => onSelectAll(checked === true)}
                aria-label="Select all participants"
              />
            </TableHead>
            <TableHead>Participant</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Source</TableHead>
            <TableHead className="hidden lg:table-cell">Tags</TableHead>
            <TableHead className="hidden lg:table-cell">Studies</TableHead>
            <TableHead className="hidden lg:table-cell">Last Active</TableHead>
            <TableHead sortable={false} className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((participant, index) => {
            const displayName = getDisplayName(participant)
            const isSelected = selectedIds.has(participant.id)

            return (
              <TableRow
                key={participant.id}
                className={cn(
                  'cursor-pointer transition-all duration-200',
                  isSelected && 'bg-primary/5 hover:bg-primary/10',
                  'animate-in fade-in slide-in-from-bottom-2'
                )}
                style={{
                  animationDelay: `${Math.min(index * 30, 300)}ms`,
                  animationDuration: '400ms',
                  animationFillMode: 'both',
                }}
                onClick={() => onViewDetails(participant)}
                onMouseEnter={() => onPrefetch?.(participant)}
              >
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  className="w-12"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectId(participant.id, !!checked)}
                    aria-label={`Select ${participant.email}`}
                  />
                </TableCell>

                <TableCell>
                  <div className="flex flex-col">
                    {displayName && (
                      <span className="text-sm font-medium">{displayName}</span>
                    )}
                    <span className={cn('text-sm', displayName && 'text-muted-foreground')}>
                      {participant.email}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <ParticipantStatusBadge status={participant.status} />
                </TableCell>

                <TableCell className="hidden sm:table-cell">
                  <ParticipantSourceBadge source={participant.source} />
                </TableCell>

                <TableCell className="hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {participant.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground"
                      >
                        {tag.name}
                      </span>
                    ))}
                    {participant.tags.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                        +{participant.tags.length - 3}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {participant.study_count ?? 0} {(participant.study_count ?? 0) === 1 ? 'study' : 'studies'}
                  </span>
                </TableCell>

                <TableCell className="hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {participant.last_active_at
                      ? formatDistanceToNow(new Date(participant.last_active_at), { addSuffix: true })
                      : 'Never'}
                  </span>
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()} className="w-12">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails(participant)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(participant)}>
                        Edit Participant
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(participant)}
                        className="text-destructive focus:text-destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
})
