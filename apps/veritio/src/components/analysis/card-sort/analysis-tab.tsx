'use client'

import { useState, useMemo, useEffect, useCallback, memo } from 'react'
import dynamic from 'next/dynamic'
import { useAuthFetch } from '@/hooks'
import { useCardSortAnalysis } from '@/hooks/use-card-sort-analysis'
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
import { CardsTab } from './cards-tab'
import { CategoriesTab } from './categories-tab'
import { StandardizationGrid } from './standardization-grid'
import { ResultsMatrix } from './results-matrix'
import { CreateSegmentModal } from './participants/create-segment-modal'
import { toast } from '@/components/ui/sonner'
import {
  SimilarityMatrixSkeleton,
  PCATabSkeleton,
} from '../shared/analysis-sub-tab-skeletons'
import { prefetchResultsTabBundle } from '@/lib/prefetch/results-tab-prefetch'

// Dynamic imports for heavy visualization components with dimension-matched skeletons
const SimilarityMatrix = dynamic(
  () => import('./similarity-matrix').then(mod => ({ default: mod.SimilarityMatrix })),
  { loading: () => <SimilarityMatrixSkeleton />, ssr: false }
)
const PCATab = dynamic(
  () => import('./pca-tab').then(mod => ({ default: mod.PCATab })),
  { loading: () => <PCATabSkeleton />, ssr: false }
)
import type {
  Participant,
  Card,
  Category,
  SegmentConditionsV2,
} from '@veritio/study-types'
import type { StandardizationMapping } from '@/lib/algorithms/category-standardization'
import type { DendrogramNode } from '@/lib/algorithms/hierarchical-clustering'
import type { SimilarityResult } from '@/lib/algorithms/similarity-matrix'

interface ResponseData {
  id?: string
  participant_id: string
  card_placements: Record<string, string> | unknown
  custom_categories?: unknown
  total_time_ms?: number | null
}

interface AnalysisData {
  similarityMatrix: SimilarityResult
  dendrogram: DendrogramNode
  optimalOrder: string[]
  suggestedClusters: { count: number; heights: number[] }
  topSimilarPairs: { cardA: string; cardB: string; similarity: number }[]
  naturalClusters: string[][]
  categoryAgreement: Record<string, {
    cardLabel: string
    categories: { name: string; count: number; percentage: number }[]
  }>
}

interface AnalysisTabProps {
  studyId: string
  cards: Card[]
  categories: Category[]
  responses: ResponseData[]
  participants: Participant[]
  standardizations: StandardizationMapping[]
  analysis: AnalysisData | null
  mode: 'open' | 'closed' | 'hybrid'
  /** Callback to navigate to the Segments section in Participants tab */
  onNavigateToSegments?: () => void
  /** Initial sub-tab (for state persistence) */
  initialSubTab?: string
  /** Callback when sub-tab changes (for state persistence) */
  onSubTabChange?: (tab: string) => void
  /** Callback when standardizations are saved successfully (notifies parent for overview sync) */
  onStandardizationsSaved?: (standardizations: StandardizationMapping[]) => void
}

type AnalysisSubTab =
  | 'cards'
  | 'categories'
  | 'standardization'
  | 'results-matrix'
  | 'similarity'
  | 'pca'

function AnalysisTabBase({
  studyId,
  cards,
  categories,
  responses,
  participants,
  standardizations: initialStandardizations,
  analysis,
  mode,
  onNavigateToSegments,
  initialSubTab = 'cards',
  onSubTabChange,
  onStandardizationsSaved,
}: AnalysisTabProps) {
  const [activeSubTab, setActiveSubTabInternal] = useState<AnalysisSubTab>(initialSubTab as AnalysisSubTab)
  const [segmentDropdownOpen, setSegmentDropdownOpen] = useState(false)
  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false)

  const authFetch = useAuthFetch()

  const { analysis: lazyAnalysis } = useCardSortAnalysis(
    analysis === null ? studyId : null
  )
  const displayAnalysis = analysis || lazyAnalysis

  const setActiveSubTab = (tab: AnalysisSubTab) => {
    setActiveSubTabInternal(tab)
    onSubTabChange?.(tab)
  }

  const [localStandardizations, setLocalStandardizations] = useState<StandardizationMapping[]>(
    initialStandardizations
  )

  useEffect(() => {
    setLocalStandardizations(initialStandardizations)
  }, [initialStandardizations])

  const handleStandardizationsChange = useCallback(
    async (newStandardizations: StandardizationMapping[]) => {
      setLocalStandardizations(newStandardizations)

      try {
        const response = await authFetch(`/api/studies/${studyId}/standardizations`, {
          method: 'PUT',
          body: JSON.stringify({ standardizations: newStandardizations }),
        })

        if (!response.ok) {
          throw new Error('Failed to save standardizations')
        }

        toast.success('Standardizations saved')
        onStandardizationsSaved?.(newStandardizations)
      } catch {
        setLocalStandardizations(initialStandardizations)
        toast.error('Failed to save standardizations')
      }
    },
    [studyId, initialStandardizations, authFetch, onStandardizationsSaved]
  )

  const {
    savedSegments,
    activeSegmentId,
    applySegment,
    clearSegment,
    filteredParticipantIds,
    availableQuestions,
    availableUrlTags,
    categoriesRange,
    timeRange,
    setSavedSegments,
  } = useSegment()

  const activeSegment = savedSegments.find(s => s.id === activeSegmentId)

  const filteredResponses = useMemo(() => {
    if (!filteredParticipantIds) return responses
    return responses.filter(r => filteredParticipantIds.has(r.participant_id))
  }, [responses, filteredParticipantIds])

  const handleCreateSegment = async (
    name: string,
    description: string | null,
    conditions: SegmentConditionsV2
  ) => {
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
  }

  const subTabs: { value: AnalysisSubTab; label: string; show: boolean }[] = [
    { value: 'cards', label: 'Cards', show: true },
    { value: 'categories', label: 'Categories', show: true },
    { value: 'standardization', label: 'Standardization grid', show: mode !== 'closed' },
    { value: 'results-matrix', label: 'Results matrix', show: mode === 'closed' },
    { value: 'similarity', label: 'Similarity matrix', show: !!displayAnalysis },
    { value: 'pca', label: 'PCA', show: true },
  ]

  const visibleTabs = subTabs.filter(tab => tab.show)

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
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as AnalysisSubTab)}>
        <div className="sticky top-[52px] z-10 bg-background -mx-4 sm:-mx-6 px-4 sm:px-6 py-2">
          <TabsList variant="underline" className="flex-wrap h-auto">
            {visibleTabs.map(tab => (
              <TabsTrigger
                key={tab.value}
                variant="underline"
                value={tab.value}
                onMouseEnter={() => prefetchResultsTabBundle(tab.value === 'similarity' ? 'similarity-matrix' : tab.value)}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="cards" className="mt-0" data-slot="analysis-tab-content">
          <CardsTab
            cards={cards}
            responses={filteredResponses}
            categories={categories}
            mode={mode}
            headerActions={segmentDropdown}
          />
        </TabsContent>

        <TabsContent value="categories" className="mt-0" data-slot="analysis-tab-content">
          <CategoriesTab
            categories={categories}
            cards={cards}
            responses={filteredResponses}
            mode={mode}
            headerActions={segmentDropdown}
            standardizations={localStandardizations}
            onStandardizationsChange={handleStandardizationsChange}
          />
        </TabsContent>

        {mode !== 'closed' && (
          <TabsContent value="standardization" className="mt-0" data-slot="analysis-tab-content">
            <StandardizationGrid
              cards={cards}
              responses={filteredResponses}
              standardizations={localStandardizations}
              headerActions={segmentDropdown}
            />
          </TabsContent>
        )}

        {mode === 'closed' && (
          <TabsContent value="results-matrix" className="mt-0" data-slot="analysis-tab-content">
            <ResultsMatrix
              cards={cards}
              categories={categories}
              responses={filteredResponses}
            />
          </TabsContent>
        )}

        {displayAnalysis && (
          <TabsContent value="similarity" className="mt-0" data-slot="analysis-tab-content" keepMounted>
            <SimilarityMatrix
              data={displayAnalysis.similarityMatrix}
              optimalOrder={displayAnalysis.optimalOrder}
              headerActions={segmentDropdown}
              participantCount={filteredResponses.length}
            />
          </TabsContent>
        )}

        <TabsContent value="pca" className="mt-0" data-slot="analysis-tab-content" keepMounted>
          <PCATab
            cards={cards}
            responses={filteredResponses}
            participants={participants}
          />
        </TabsContent>
      </Tabs>

      <CreateSegmentModal
        open={showCreateSegmentModal}
        onOpenChange={setShowCreateSegmentModal}
        onSave={handleCreateSegment}
        questions={availableQuestions}
        urlTags={availableUrlTags}
        categoriesRange={categoriesRange}
        timeRange={timeRange}
      />
    </>
  )
}

export const AnalysisTab = memo(AnalysisTabBase, (prev, next) => {
  return (
    prev.studyId === next.studyId &&
    prev.cards === next.cards &&
    prev.categories === next.categories &&
    prev.responses === next.responses &&
    prev.participants === next.participants &&
    prev.standardizations === next.standardizations &&
    prev.analysis === next.analysis &&
    prev.mode === next.mode &&
    prev.initialSubTab === next.initialSubTab &&
    prev.onStandardizationsSaved === next.onStandardizationsSaved
  )
})
