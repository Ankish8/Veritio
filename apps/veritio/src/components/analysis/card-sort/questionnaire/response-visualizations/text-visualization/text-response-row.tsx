'use client'

/**
 * TextResponseRow
 *
 * Renders a single row in the text visualization table.
 * Handles expand/collapse for long responses and exclusion badges.
 */

import { memo } from 'react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TextResponseRow as TextResponseRowType } from './use-participant-detail-panel'

const TRUNCATE_LENGTH = 150 // Characters before truncating

interface TextResponseRowProps {
  row: TextResponseRowType
  rowIndex: number
  isExpanded: boolean
  maxWordCount: number
  hasPanelSupport: boolean
  onToggleExpand: (participantId: string) => void
  onClick?: () => void
  studyId?: string
  responseId?: string
}

export const TextResponseRow = memo(function TextResponseRow({
  row,
  rowIndex: _rowIndex,
  isExpanded,
  maxWordCount,
  hasPanelSupport,
  onToggleExpand,
  onClick,
  studyId: _studyId,
  responseId: _responseId,
}: TextResponseRowProps) {
  const isLongResponse = row.answer.length > TRUNCATE_LENGTH
  const displayAnswer =
    isLongResponse && !isExpanded ? row.answer.slice(0, TRUNCATE_LENGTH) + '...' : row.answer
  const lengthPercent = Math.round((row.wordCount / maxWordCount) * 100)

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click
    onToggleExpand(row.participantId)
  }

  return (
    <TableRow
      className={cn(
        row.isExcluded && 'opacity-50',
        hasPanelSupport && 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={onClick}
    >
      <TableCell className="align-top">
        <div className="flex flex-col">
          <span className="font-medium">
            <span
              className={cn(
                hasPanelSupport &&
                  'border-b border-dashed border-muted-foreground/50 hover:border-solid hover:border-primary hover:text-primary transition-colors'
              )}
            >
              Participant {row.participantIndex}
            </span>
            {row.isExcluded && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Excluded
              </Badge>
            )}
          </span>
          {row.identifier && (
            <span className="text-sm text-muted-foreground">{row.identifier}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="space-y-1">
          <p className="whitespace-pre-wrap">{displayAnswer}</p>
          {isLongResponse && (
            <button
              onClick={handleExpandClick}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5"
            >
              {isExpanded ? (
                <>
                  Show less
                  <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Show more
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  {row.wordCount} {row.wordCount === 1 ? 'word' : 'words'}
                </span>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/30 rounded-full transition-all"
                    style={{ width: `${lengthPercent}%` }}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              {row.answer.length} characters
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  )
})
