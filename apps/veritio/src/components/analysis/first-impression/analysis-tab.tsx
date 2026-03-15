'use client'

/**
 * First Impression Analysis Tab
 *
 * Analysis sub-tabs: Design Results, Responses, Comparison, Insights.
 * Includes segment filtering functionality matching first-click design.
 */

import { useState, useMemo, memo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronDown, ChevronUp, Check, Plus, List } from 'lucide-react'
import { useSegment } from '@/contexts/segment-context'
import { useAuthFetch } from '@/hooks'
import { CreateSegmentModal } from '../card-sort/participants/create-segment-modal'
import { ComparisonTab } from './comparison'
import { QuestionResponsesTab } from './responses'
import type { FirstImpressionResultsResponse, DesignMetric, QuestionMetric } from '@/services/results/first-impression'
import type { SegmentConditionsV2 } from '@veritio/study-types'
import { prefetchResultsTabBundle } from '@/lib/prefetch/results-tab-prefetch'

interface FirstImpressionAnalysisProps {
  data: FirstImpressionResultsResponse
  initialSubTab?: string
  onSubTabChange?: (tab: string) => void
  onNavigateToSegments?: () => void
}

type AnalysisSubTab = 'design-results' | 'question-responses' | 'comparison'

function FirstImpressionAnalysisBase({
  data,
  initialSubTab = 'design-results',
  onSubTabChange,
  onNavigateToSegments,
}: FirstImpressionAnalysisProps) {
  // Fallback for persisted tab values that have been removed
  const validInitialTab = (['word-cloud', 'insights'].includes(initialSubTab) ? 'design-results' : initialSubTab) as AnalysisSubTab
  const [activeSubTab, setActiveSubTab] = useState<AnalysisSubTab>(validInitialTab)
  const [segmentDropdownOpen, setSegmentDropdownOpen] = useState(false)
  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false)
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null)

  // Auth setup for API calls
  const authFetch = useAuthFetch()

  // Segment filtering
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

  // Filter out practice designs
  const analysisDesigns = useMemo(
    () => data.metrics.designMetrics.filter(d => !d.isPractice),
    [data.metrics.designMetrics]
  )

  // Get the selected design or first non-practice design
  const selectedDesign = useMemo(() => {
    if (selectedDesignId) {
      return analysisDesigns.find(d => d.designId === selectedDesignId) || analysisDesigns[0]
    }
    return analysisDesigns[0]
  }, [selectedDesignId, analysisDesigns])

  // Handle sub-tab changes
  const handleSubTabChange = (tab: string) => {
    // Fallback for any lingering removed tab references
    const resolved = ['word-cloud', 'insights'].includes(tab) ? 'design-results' : tab
    setActiveSubTab(resolved as AnalysisSubTab)
    onSubTabChange?.(resolved)
  }

  // Create a new segment
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

  // Segment dropdown component
  const segmentDropdown = (
    <DropdownMenu open={segmentDropdownOpen} onOpenChange={setSegmentDropdownOpen}>
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
        {/* Sticky sub-tabs row with segment dropdown */}
        <div className="sticky top-[52px] z-10 bg-background -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 flex items-center justify-between mb-4">
          <TabsList variant="underline">
            <TabsTrigger variant="underline" value="design-results">
              Design Results
            </TabsTrigger>
            <TabsTrigger variant="underline" value="question-responses" onMouseEnter={() => prefetchResultsTabBundle('responses')}>
              Responses
            </TabsTrigger>
            <TabsTrigger variant="underline" value="comparison" onMouseEnter={() => prefetchResultsTabBundle('comparison')}>
              Comparison
            </TabsTrigger>
          </TabsList>
          {segmentDropdown}
        </div>

        <TabsContent value="design-results" className="mt-0" data-slot="analysis-tab-content">
          <DesignResultsTab
            designs={analysisDesigns}
            selectedDesign={selectedDesign}
            onSelectDesign={setSelectedDesignId}
          />
        </TabsContent>

        <TabsContent value="question-responses" className="mt-0" data-slot="analysis-tab-content">
          <QuestionResponsesTab
            data={data}
            designs={analysisDesigns}
            selectedDesignId={selectedDesignId}
            onSelectDesign={setSelectedDesignId}
            studyId={data.study.id}
          />
        </TabsContent>

        <TabsContent value="comparison" className="mt-0" data-slot="analysis-tab-content">
          <ComparisonTab results={data} />
        </TabsContent>
      </Tabs>

      <CreateSegmentModal
        open={showCreateSegmentModal}
        onOpenChange={setShowCreateSegmentModal}
        onSave={handleCreateSegment}
        questions={availableQuestions}
        urlTags={availableUrlTags}
        categoriesRange={{ min: 0, max: 0 }}
        timeRange={timeRange}
      />
    </>
  )
}

// Design Results Sub-Tab
interface DesignResultsTabProps {
  designs: DesignMetric[]
  selectedDesign: DesignMetric | undefined
  onSelectDesign: (id: string) => void
}

function DesignResultsTab({ designs, selectedDesign, onSelectDesign }: DesignResultsTabProps) {
  if (!designs.length) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            No designs have been configured for this study.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Design Selector Dropdown */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Design</span>
        <Select
          value={selectedDesign?.designId}
          onValueChange={onSelectDesign}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select design" />
          </SelectTrigger>
          <SelectContent>
            {designs.map((design) => (
              <SelectItem key={design.designId} value={design.designId}>
                {design.designName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDesign && (
        <>
          {/* Compact Stats Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border">
              <div className="text-lg font-semibold">{selectedDesign.exposureCount}</div>
              <div className="text-xs text-muted-foreground">Exposures</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-lg font-semibold">{selectedDesign.exposurePercentage.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Distribution</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-lg font-semibold">{(selectedDesign.avgExposureDurationMs / 1000).toFixed(1)}s</div>
              <div className="text-xs text-muted-foreground">Avg. Exposure</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-lg font-semibold">
                {selectedDesign.avgQuestionTimeMs > 0
                  ? `${(selectedDesign.avgQuestionTimeMs / 1000).toFixed(1)}s`
                  : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">Avg. Question Time</div>
            </div>
          </div>

          {/* Design Preview */}
          <Card>
            <CardContent className="p-4">
              {selectedDesign.imageUrl ? (
                <div className="rounded-lg border overflow-hidden bg-muted max-h-[600px] flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={selectedDesign.imageUrl}
                    alt={selectedDesign.designName}
                    className="w-full h-full object-contain max-h-[600px]"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-lg border bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">No image</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Questions Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Questions</CardTitle>
              <CardDescription>
                {selectedDesign.questionMetrics.length} question{selectedDesign.questionMetrics.length !== 1 ? 's' : ''} configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDesign.questionMetrics.length > 0 ? (
                <div className="space-y-3">
                  {selectedDesign.questionMetrics.map((question, idx) => (
                    <QuestionSummary key={question.questionId} question={question} index={idx} />
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No questions configured for this design.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// Question type label helper
function formatQuestionType(type: string): string {
  const labels: Record<string, string> = {
    short_text: 'Short Text',
    long_text: 'Long Text',
    single_line_text: 'Short Text',
    multi_line_text: 'Long Text',
    single_choice: 'Single Choice',
    multiple_choice: 'Multiple Choice',
    yes_no: 'Yes/No',
    image_choice: 'Image Choice',
    rating: 'Rating',
    scale: 'Scale',
    opinion_scale: 'Opinion Scale',
    nps: 'NPS',
    slider: 'Slider',
  }
  return labels[type] || type
}

// Question Summary Component (compact - used in Design Results tab)
function QuestionSummary({ question, index }: { question: QuestionMetric; index: number }) {
  return (
    <div className="border-b last:border-0 pb-3 last:pb-0">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">Q{index + 1}: {question.prompt}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs">
            {formatQuestionType(question.type)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {question.responseCount}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{question.responseRate.toFixed(0)}% response rate</span>
        {question.avgRating !== undefined && (
          <>
            <span>•</span>
            <span>Avg: {question.avgRating.toFixed(1)}</span>
          </>
        )}
        {question.optionCounts && question.optionCounts.length > 0 && (
          <>
            <span>•</span>
            <span>Top: {question.optionCounts[0].option} ({question.optionCounts[0].percentage.toFixed(0)}%)</span>
          </>
        )}
        {question.sampleResponses && question.sampleResponses.length > 0 && (
          <>
            <span>•</span>
            <span className="truncate max-w-[200px]">&ldquo;{question.sampleResponses[0]}&rdquo;</span>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Memoized First Impression Analysis Tab - prevents re-renders when switching between main tabs
 */
export const FirstImpressionAnalysis = memo(FirstImpressionAnalysisBase, (prev, next) => {
  return (
    prev.data === next.data &&
    prev.initialSubTab === next.initialSubTab
  )
})

