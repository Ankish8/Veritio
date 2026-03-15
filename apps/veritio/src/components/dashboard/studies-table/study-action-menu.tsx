'use client'

import { memo } from 'react'
import Link from 'next/link'
import {
  MoreHorizontal,
  Pencil,
  BarChart3,
  Trash2,
  Copy,
  Archive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { StudyStatus } from './study-status-badge'

export interface StudyActionMenuProps {
  studyId: string
  studyStatus: StudyStatus
  projectId: string
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
}

export const StudyActionMenu = memo(function StudyActionMenu({
  studyId,
  studyStatus,
  projectId,
  onDuplicate,
  onArchive,
  onDelete,
}: StudyActionMenuProps) {
  // Only show "View Results" for launched studies (not draft)
  const isLaunched = studyStatus !== 'draft'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Quick Navigation */}
        {isLaunched && (
          <DropdownMenuItem asChild>
            <Link href={`/projects/${projectId}/studies/${studyId}/results`}>
              <BarChart3 className="mr-2 h-4 w-4" />
              View Results
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href={`/projects/${projectId}/studies/${studyId}/builder`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Study
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Utility Actions */}
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onArchive}>
          <Archive className="mr-2 h-4 w-4" />
          Archive
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
