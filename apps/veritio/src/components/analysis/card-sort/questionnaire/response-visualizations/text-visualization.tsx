'use client'

/**
 * TextVisualization
 *
 * Visualization for text questions (single_line_text, multi_line_text).
 * Shows a paginated table with Participant | Answer columns and search.
 *
 * Decomposed components:
 * - TextResponseRow: Individual row rendering
 * - TextVisualizationPagination: Pagination controls
 * - useParticipantDetailPanel: Panel logic hook
 */

import React, { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { usePagination } from '@veritio/ui'
import { TextStatsPanel } from './text-stats-panel'
import {
  TextResponseRow,
  TextVisualizationPagination,
  useParticipantDetailPanel,
  type TextResponseRowType,
} from './text-visualization/index'
import type { Participant, StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'

interface TextVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
  participants: Participant[]
  filteredParticipantIds: Set<string> | null
  isStatsOpen?: boolean
  setIsStatsOpen?: (value: boolean) => void
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
  studyId?: string
}

type SortField = 'participant' | 'answer' | 'length' | null
type SortDirection = 'asc' | 'desc'

export const TextVisualization = React.memo(function TextVisualization({
  question: _question,
  responses,
  participants,
  filteredParticipantIds: _filteredParticipantIds,
  isStatsOpen: isStatsOpenProp,
  setIsStatsOpen: setIsStatsOpenProp,
  flowQuestions,
  flowResponses,
  studyId,
}: TextVisualizationProps) {
  // Local state fallback for stats panel when not controlled externally
  const [localIsStatsOpen, setLocalIsStatsOpen] = useState(false)
  const isStatsOpen = isStatsOpenProp ?? localIsStatsOpen
  const setIsStatsOpen = setIsStatsOpenProp ?? setLocalIsStatsOpen

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [excludedParticipantIds, setExcludedParticipantIds] = useState<Set<string>>(new Set())

  // Build participant lookup map with stable indices
  const participantMap = useMemo(() => {
    const map = new Map<string, Participant & { stableIndex: number }>()
    participants.forEach((p, index) => {
      map.set(p.id, { ...p, stableIndex: index + 1 })
    })
    return map
  }, [participants])

  // Build rows with participant info and word count
  const allRows = useMemo(() => {
    const rows: TextResponseRowType[] = []

    responses.forEach((response) => {
      const participant = participantMap.get(response.participant_id)
      const answer =
        typeof response.response_value === 'string'
          ? response.response_value
          : String(response.response_value || '')

      const wordCount = answer
        .trim()
        .split(/\s+/)
        .filter((w: string) => w.length > 0).length

      rows.push({
        participantId: response.participant_id,
        participantIndex: participant?.stableIndex || 0,
        identifier: participant?.identifier_value || null,
        answer,
        wordCount,
        isExcluded: excludedParticipantIds.has(response.participant_id),
        responseId: response.id,  // For evidence marking
      })
    })

    return rows
  }, [responses, participantMap, excludedParticipantIds])

  // Calculate max word count for length indicator scaling
  const maxWordCount = useMemo(() => {
    return Math.max(...allRows.map((r) => r.wordCount), 1)
  }, [allRows])

  // Filter by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return allRows

    const query = searchQuery.toLowerCase()
    return allRows.filter(
      (row) =>
        row.answer.toLowerCase().includes(query) ||
        (row.identifier && row.identifier.toLowerCase().includes(query)) ||
        `participant ${row.participantIndex}`.toLowerCase().includes(query)
    )
  }, [allRows, searchQuery])

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortField) return filteredRows

    return [...filteredRows].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'participant':
          comparison = a.participantIndex - b.participantIndex
          break
        case 'answer':
          comparison = a.answer.localeCompare(b.answer)
          break
        case 'length':
          comparison = a.wordCount - b.wordCount
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredRows, sortField, sortDirection])

  // Pagination
  const {
    items: paginatedRows,
    showingRange,
    hasNextPage,
    hasPreviousPage,
    setPage,
    setPageSize,
    pageSize,
    nextPage,
    previousPage,
  } = usePagination(sortedRows, { defaultPageSize: 10 })

  // Participant detail panel hook
  const { hasPanelSupport, handleParticipantClick } = useParticipantDetailPanel({
    participantMap,
    sortedRows,
    flowQuestions,
    flowResponses,
    excludedParticipantIds,
    setExcludedParticipantIds,
  })

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortField(null)
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setPage(1)
  }

  // Get sort icon for header
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    )
  }

  // Toggle row expansion
  const toggleRowExpansion = (participantId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(participantId)) {
        next.delete(participantId)
      } else {
        next.add(participantId)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Collapsible stats panel */}
      <Collapsible open={isStatsOpen} onOpenChange={setIsStatsOpen}>
        <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <TextStatsPanel
            responses={responses}
            totalParticipants={participants.length}
            onKeywordClick={(keyword) => {
              setSearchQuery(keyword)
              setPage(1)
            }}
            activeKeyword={searchQuery}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search answers"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(1)
          }}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead sortable={false} className="w-[200px]">
              <button
                onClick={() => handleSort('participant')}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                Participant
                {getSortIcon('participant')}
              </button>
            </TableHead>
            <TableHead sortable={false}>
              <button
                onClick={() => handleSort('answer')}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                Answer
                {getSortIcon('answer')}
              </button>
            </TableHead>
            <TableHead sortable={false} className="w-[100px]">
              <button
                onClick={() => handleSort('length')}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                Length
                {getSortIcon('length')}
              </button>
            </TableHead>
            {studyId && (
              <TableHead sortable={false} className="w-[60px]">
                <div className="flex items-center justify-center">
                  Actions
                </div>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedRows.map((row, rowIndex) => (
            <TextResponseRow
              key={row.participantId}
              row={row}
              rowIndex={rowIndex}
              isExpanded={expandedRows.has(row.participantId)}
              maxWordCount={maxWordCount}
              hasPanelSupport={hasPanelSupport}
              onToggleExpand={toggleRowExpansion}
              onClick={
                hasPanelSupport ? () => handleParticipantClick(row, rowIndex) : undefined
              }
              studyId={studyId}
              responseId={row.responseId}
            />
          ))}
          {paginatedRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={studyId ? 4 : 3} className="text-center text-muted-foreground py-8">
                {searchQuery ? 'No matching responses found' : 'No responses yet'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination controls */}
      {filteredRows.length > 0 && (
        <TextVisualizationPagination
          pageSize={pageSize}
          showingRange={showingRange}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onPageSizeChange={setPageSize}
          onNextPage={nextPage}
          onPreviousPage={previousPage}
        />
      )}
    </div>
  )
})
