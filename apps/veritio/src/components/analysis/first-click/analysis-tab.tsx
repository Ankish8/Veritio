'use client'

import { useState, memo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, ChevronUp, Check, Plus, List } from 'lucide-react'
import { useSegment } from '@/contexts/segment-context'
import { useAuthFetch, useHeatmapSettings, useClickMapsPanels } from '@/hooks'
import { CreateSegmentModal } from '../card-sort/participants/create-segment-modal'
import { TaskResultsTab } from './task-results'
import { FirstClickClickMapsTab } from './click-maps-tab'
import type { FirstClickResultsResponse } from '@/services/results/first-click'
import type { SegmentConditionsV2 } from '@veritio/study-types'
import { prefetchResultsTabBundle } from '@/lib/prefetch/results-tab-prefetch'

interface FirstClickAnalysisProps {
  data: FirstClickResultsResponse
  initialSubTab?: string
  onSubTabChange?: (tab: string) => void
  onNavigateToSegments?: () => void
}

type AnalysisSubTab = 'task-results' | 'click-maps'

function FirstClickAnalysisBase({
  data,
  initialSubTab = 'task-results',
  onSubTabChange,
  onNavigateToSegments,
}: FirstClickAnalysisProps) {
  const [activeSubTab, setActiveSubTab] = useState<AnalysisSubTab>(initialSubTab as AnalysisSubTab)
  const [segmentDropdownOpen, setSegmentDropdownOpen] = useState(false)
  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false)

  const { settings: heatmapSettings, setSettings: setHeatmapSettings, resetSettings: resetHeatmapSettings } = useHeatmapSettings()

  useClickMapsPanels({
    isActive: activeSubTab === 'click-maps',
    displayMode: 'heatmap',
    heatmapSettings,
    onHeatmapSettingsChange: setHeatmapSettings,
    onResetHeatmapSettings: resetHeatmapSettings,
    hasHitMissData: true,
  })

  const authFetch = useAuthFetch()

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

  const activeSegment = savedSegments.find(s => s.id === activeSegmentId)

  const handleSubTabChange = (tab: string) => {
    setActiveSubTab(tab as AnalysisSubTab)
    onSubTabChange?.(tab)
  }

  const handleCreateSegment = async (
    name: string,
    description: string | null,
    conditions: SegmentConditionsV2
  ) => {
    const response = await authFetch(`/api/studies/${data.study.id}/segments`, {
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
  }

  const segmentDropdown = (
    <DropdownMenu open={segmentDropdownOpen} onOpenChange={setSegmentDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-[180px] justify-between">
          <span className="truncate">
            {activeSegment ? activeSegment.name : 'All included participants'}
          </span>
          {segmentDropdownOpen
            ? <ChevronUp className="ml-2 h-4 w-4 shrink-0" />
            : <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          }
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem onClick={clearSegment} className="flex items-center gap-2">
          {!activeSegmentId ? <Check className="h-4 w-4" /> : <span className="w-4" />}
          All included participants
        </DropdownMenuItem>
        {savedSegments.map((segment) => (
          <DropdownMenuItem
            key={segment.id}
            onClick={() => applySegment(segment.id)}
            className="flex items-center gap-2"
          >
            {activeSegmentId === segment.id ? <Check className="h-4 w-4" /> : <span className="w-4" />}
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
          onClick={() => {
            setSegmentDropdownOpen(false)
            onNavigateToSegments?.()
          }}
          className="flex items-center gap-2"
        >
          <List className="h-4 w-4" />
          View all segments
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
        <div className="sticky top-[52px] z-10 bg-background -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 flex items-center justify-between mb-4">
          <TabsList variant="underline">
            <TabsTrigger variant="underline" value="task-results" onMouseEnter={() => prefetchResultsTabBundle('first-click-task-results')}>
              Task Results
            </TabsTrigger>
            <TabsTrigger variant="underline" value="click-maps" onMouseEnter={() => prefetchResultsTabBundle('first-click-click-maps')}>
              Click Maps
            </TabsTrigger>
          </TabsList>
          {segmentDropdown}
        </div>

        <TabsContent value="task-results" className="mt-0" data-slot="analysis-tab-content">
          <TaskResultsTab data={data} />
        </TabsContent>

        <TabsContent value="click-maps" className="mt-0" data-slot="analysis-tab-content">
          <FirstClickClickMapsTab studyId={data.study.id} settings={heatmapSettings} />
        </TabsContent>
      </Tabs>

      <CreateSegmentModal
        open={showCreateSegmentModal}
        onOpenChange={setShowCreateSegmentModal}
        onSave={handleCreateSegment}
        questions={availableQuestions}
        urlTags={availableUrlTags}
        categoriesRange={{ min: 0, max: 0 }} // First-click tests don't have categories
        timeRange={timeRange}
      />
    </>
  )
}

export const FirstClickAnalysis = memo(FirstClickAnalysisBase, (prev, next) => {
  return (
    prev.data === next.data &&
    prev.initialSubTab === next.initialSubTab
  )
})
