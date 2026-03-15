'use client'

/**
 * ParticipantsTabContainerBase
 *
 * Shared base component for all participants tab containers.
 * Handles the common UI pattern:
 * - List/Segments sub-tabs
 * - Segment dropdown filter
 * - Status filter dropdown (configurable per test type)
 * - Segment creation modal
 *
 * This eliminates ~200 lines of duplicated code per test type.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuthFetch } from '@/hooks'
import { useFloatingActionBar } from '@/components/analysis/shared/floating-action-bar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, ChevronUp, Filter, Check, Plus, List } from 'lucide-react'
import { SegmentsList, CreateSegmentModal } from '@/components/analysis/card-sort/participants'
import { useSegment } from '@/contexts/segment-context'
import type { SegmentConditionsV2 } from '@veritio/study-types'
import type { ParticipantsTabContainerBaseProps } from './types'

/**
 * Generic participants tab container with configurable status filters.
 *
 * @example
 * ```tsx
 * <ParticipantsTabContainerBase
 *   studyId={studyId}
 *   participants={participants}
 *   statusFilterConfig={standardStatusFilterConfig}
 *   segmentConfig={{ categoriesRange: { min: 0, max: 10 } }}
 *   segmentListResponses={responses}
 *   renderParticipantsList={({ statusFilter }) => (
 *     <MyParticipantsList statusFilter={statusFilter} />
 *   )}
 * />
 * ```
 */
export function ParticipantsTabContainerBase<TStatusFilter extends string>({
  studyId,
  participants,
  flowQuestions = [],
  flowResponses = [],
  initialTab = 'list',
  onTabChange,
  statusFilter: controlledStatusFilter,
  onStatusFilterChange,
  statusFilterConfig,
  segmentConfig,
  segmentListResponses,
  statusFilterExtraData,
  renderParticipantsList,
  renderSegmentsList,
  renderHeaderControls,
  readOnly,
}: ParticipantsTabContainerBaseProps<TStatusFilter>) {
  // State management
  const [activeTab, setActiveTabInternal] = useState<'list' | 'segments'>(initialTab)
  const [internalStatusFilter, setInternalStatusFilter] = useState<TStatusFilter>(
    statusFilterConfig.defaultValue
  )
  const [segmentDropdownOpen, setSegmentDropdownOpen] = useState(false)
  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false)

  // Auth setup for API calls (skip in readOnly/public mode)
  const authFetch = useAuthFetch()
  const skipAuth = !!readOnly

  // Get closePanel to close participant detail panel on tab change
  const { closePanel } = useFloatingActionBar()

  // Use controlled status filter if provided, otherwise use internal state
  const statusFilter =
    controlledStatusFilter !== undefined ? controlledStatusFilter : internalStatusFilter

  // Wrapper to update status filter (calls callback if provided)
  const setStatusFilter = useCallback(
    (filter: TStatusFilter) => {
      if (onStatusFilterChange) {
        onStatusFilterChange(filter)
      } else {
        setInternalStatusFilter(filter)
      }
    },
    [onStatusFilterChange]
  )

  // Wrapper to update active tab (calls callback if provided)
  // Also closes any open participant detail panel
  const setActiveTab = useCallback(
    (tab: 'list' | 'segments') => {
      setActiveTabInternal(tab)
      onTabChange?.(tab)
      // Close participant detail panel when switching tabs
      closePanel()
    },
    [onTabChange, closePanel]
  )

  // Sync activeTab with initialTab prop when it changes (for external navigation)
  useEffect(() => {
    setActiveTabInternal(initialTab)
  }, [initialTab])

  // Segment context
  const {
    savedSegments,
    activeSegmentId,
    applySegment,
    clearSegment,
    availableQuestions,
    availableUrlTags,
    timeRange,
    setSavedSegments,
  } = useSegment()

  const activeSegment = savedSegments.find((s) => s.id === activeSegmentId)

  // Create a new segment (V2 conditions with OR logic) — disabled in readOnly mode
  const handleCreateSegment = useCallback(
    async (name: string, description: string | null, conditions: SegmentConditionsV2) => {
      if (skipAuth) return
      const response = await authFetch(`/api/studies/${studyId}/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, conditions }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create segment')
      }

      const segment = await response.json()
      setSavedSegments([...savedSegments, segment])
      setShowCreateSegmentModal(false)
    },
    [authFetch, studyId, savedSegments, setSavedSegments, skipAuth]
  )

  // Get label for current status filter
  const currentFilterLabel =
    statusFilterConfig.options.find((o) => o.value === statusFilter)?.label || 'All statuses'

  return (
    <>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'segments')} className="flex flex-col flex-1 min-h-0">
        {/* Sticky sub-tabs row with filters on the right */}
        <div className="sticky top-[52px] z-10 bg-background -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 flex items-center justify-between mb-4">
          <TabsList variant="underline">
            <TabsTrigger variant="underline" value="list">
              Participants list
            </TabsTrigger>
            {!readOnly && (
              <TabsTrigger variant="underline" value="segments">
                Segments
              </TabsTrigger>
            )}
          </TabsList>

          {/* Filter controls - only show on list tab */}
          {activeTab === 'list' && (
            <div className="flex items-center gap-2">
              {/* Segment dropdown — hidden in readOnly/public mode */}
              {!readOnly && <DropdownMenu open={segmentDropdownOpen} onOpenChange={setSegmentDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="min-w-[180px] justify-between">
                    <span className="truncate">
                      {activeSegment ? activeSegment.name : 'All included participants'}
                    </span>
                    {segmentDropdownOpen ? (
                      <ChevronUp className="ml-2 h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuItem onClick={clearSegment} className="flex items-center gap-2">
                    {!activeSegmentId && <Check className="h-4 w-4" />}
                    {activeSegmentId && <span className="w-4" />}
                    All included participants
                  </DropdownMenuItem>
                  {savedSegments.map((segment) => (
                    <DropdownMenuItem
                      key={segment.id}
                      onClick={() => applySegment(segment.id)}
                      className="flex items-center gap-2"
                    >
                      {activeSegmentId === segment.id && <Check className="h-4 w-4" />}
                      {activeSegmentId !== segment.id && <span className="w-4" />}
                      {segment.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setSegmentDropdownOpen(false)
                      setShowCreateSegmentModal(true)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create segment
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setActiveTab('segments')}
                    className="flex items-center gap-2"
                  >
                    <List className="h-4 w-4" />
                    View all segments
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>}

              {/* Status filter dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    {currentFilterLabel}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {statusFilterConfig.options.map((option, index) => (
                    <div key={option.value}>
                      {option.separatorBefore && index > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={() => setStatusFilter(option.value as TStatusFilter)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {option.icon && <option.icon className="h-4 w-4" />}
                          <span className="flex-1">{option.label}</span>
                          {option.getCount && (
                            <span className="text-xs text-muted-foreground">
                              ({option.getCount(participants, statusFilterExtraData)})
                            </span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Additional header controls (e.g., Columns dropdown) */}
              {renderHeaderControls?.()}
            </div>
          )}
        </div>

        <TabsContent value="list" className="mt-0 flex-1 flex flex-col min-h-0">
          {renderParticipantsList({ studyId, statusFilter })}
        </TabsContent>

        {!readOnly && (
          <TabsContent value="segments" className="mt-0">
            {renderSegmentsList ? (
              renderSegmentsList({ studyId })
            ) : (
              <SegmentsList
                studyId={studyId}
                participants={participants}
                responses={segmentListResponses}
                flowQuestions={flowQuestions}
                flowResponses={flowResponses}
              />
            )}
          </TabsContent>
        )}
      </Tabs>

      {!readOnly && (
        <CreateSegmentModal
          open={showCreateSegmentModal}
          onOpenChange={setShowCreateSegmentModal}
          onSave={handleCreateSegment}
          questions={availableQuestions}
          urlTags={availableUrlTags}
          categoriesRange={segmentConfig.categoriesRange}
          timeRange={timeRange}
        />
      )}
    </>
  )
}
