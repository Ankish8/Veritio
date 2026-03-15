'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { useAuthFetch } from '@/hooks'
import { useSurveyFlowResponses } from '@/hooks/use-survey-flow-responses'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ChevronDown, Check, Plus, List, HelpCircle, EyeOff } from 'lucide-react'
import { useSegment } from '@/contexts/segment-context'
import { QuestionDisplay } from '@/components/analysis/card-sort/questionnaire/question-display'
import { CreateSegmentModal } from '@/components/analysis/card-sort/participants/create-segment-modal'
import { CrossTabulationTab } from './cross-tabulation'
import { CorrelationTab } from './correlation'
import type { StudyFlowQuestionRow, StudyFlowResponseRow, Participant, SegmentConditionsV2 } from '@veritio/study-types'
import { prefetchResultsTabBundle } from '@/lib/prefetch/results-tab-prefetch'

interface SurveyAnalysisTabProps {
  studyId: string
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  participants: Participant[]
  onNavigateToSegments: () => void
  initialSubTab?: string
  onSubTabChange?: (tab: string) => void
}

// Survey Questions Analysis component - displays all survey questions with visualizations
function SurveyQuestionsAnalysis({
  studyId,
  flowQuestions,
  flowResponses,
  participants,
  filteredParticipantIds,
  hideEmptyResponses,
}: {
  studyId: string
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  participants: Participant[]
  filteredParticipantIds: Set<string> | null
  hideEmptyResponses: boolean
}) {
  // Filter to only survey questions and sort by position
  const surveyQuestions = useMemo(() => {
    return flowQuestions
      .filter(q => q.section === 'survey')
      .sort((a, b) => a.position - b.position)
  }, [flowQuestions])

  // No survey questions
  if (surveyQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-muted-foreground">
          <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No survey questions</h3>
          <p className="text-sm max-w-md">
            This survey doesn&apos;t have any questions configured yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {surveyQuestions.map((question, index) => (
        <QuestionDisplay
          key={question.id}
          question={question}
          responses={flowResponses}
          participants={participants}
          questionIndex={index + 1}
          filteredParticipantIds={filteredParticipantIds}
          hideEmptyResponses={hideEmptyResponses}
          flowQuestions={flowQuestions}
          flowResponses={flowResponses}
          studyId={studyId}
        />
      ))}
    </div>
  )
}


function SurveyAnalysisTabBase({
  studyId,
  flowQuestions,
  flowResponses: initialFlowResponses,
  participants,
  onNavigateToSegments,
  initialSubTab = 'questions',
  onSubTabChange
}: SurveyAnalysisTabProps) {
  const [activeTab, setActiveTab] = useState(initialSubTab)
  const [segmentDropdownOpen, setSegmentDropdownOpen] = useState(false)
  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false)
  const [hideEmptyResponses, setHideEmptyResponses] = useState(false)

  // Auth setup for API calls (singleton instance)
  const authFetch = useAuthFetch()

  // Lazy load flow responses if not provided (overview endpoints return empty array)
  const { flowResponses: lazyFlowResponses } = useSurveyFlowResponses(
    initialFlowResponses.length === 0 ? studyId : null // Only fetch if empty
  )
  const flowResponses = initialFlowResponses.length > 0 ? initialFlowResponses : lazyFlowResponses

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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    onSubTabChange?.(tab)
  }

  // Create a new segment (V2 conditions with OR logic)
  const handleCreateSegment = useCallback(async (
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
  }, [authFetch, studyId, savedSegments, setSavedSegments])

  // Count survey questions
  const surveyQuestionCount = flowQuestions.filter(q => q.section === 'survey').length
  // Count responses (completed participants with responses)
  const completedParticipants = participants.filter(p => p.status === 'completed').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Analyzing <span className="font-medium text-foreground">{surveyQuestionCount} survey questions</span> from{' '}
          <span className="font-medium text-foreground">{completedParticipants} completed responses</span>
        </div>
      </div>

      {/* Analysis Sub-tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {/* Sticky sub-tabs row */}
        <div className="sticky top-[52px] z-10 bg-background -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 flex items-center justify-between">
          <TabsList variant="underline">
            <TabsTrigger variant="underline" value="questions">Questions</TabsTrigger>
            <TabsTrigger variant="underline" value="crosstab" onMouseEnter={() => prefetchResultsTabBundle('cross-tabulation')}>Cross-Tabulation</TabsTrigger>
            <TabsTrigger variant="underline" value="correlation" onMouseEnter={() => prefetchResultsTabBundle('correlation')}>Correlation</TabsTrigger>
          </TabsList>

          {/* Segment dropdown - now at tab level */}
          <DropdownMenu open={segmentDropdownOpen} onOpenChange={setSegmentDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-[180px] justify-between">
                <span className="truncate">
                  {activeSegment ? activeSegment.name : 'All included participants'}
                </span>
                <ChevronDown className={`ml-2 h-4 w-4 shrink-0 transition-transform ${segmentDropdownOpen ? 'rotate-180' : ''}`} />
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
                  onNavigateToSegments()
                }}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                View all segments
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Global hide empty responses toggle */}
              <div
                className="flex items-center gap-2 px-2 py-2"
                onClick={(e) => e.stopPropagation()}
              >
                <EyeOff className="h-4 w-4 text-muted-foreground" />
                <Label
                  htmlFor="hide-empty-global"
                  className="text-sm cursor-pointer flex-1"
                >
                  Hide empty responses
                </Label>
                <Switch
                  id="hide-empty-global"
                  checked={hideEmptyResponses}
                  onCheckedChange={setHideEmptyResponses}
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <TabsContent value="questions" className="mt-2" data-slot="analysis-tab-content">
          <Card className="border-0 shadow-none">
            <CardContent className="pt-0 px-0">
              <SurveyQuestionsAnalysis
                studyId={studyId}
                flowQuestions={flowQuestions}
                flowResponses={flowResponses}
                participants={participants}
                filteredParticipantIds={filteredParticipantIds}
                hideEmptyResponses={hideEmptyResponses}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crosstab" className="mt-2" data-slot="analysis-tab-content">
          <CrossTabulationTab
            studyId={studyId}
            flowQuestions={flowQuestions}
            flowResponses={flowResponses}
            participants={participants}
            filteredParticipantIds={filteredParticipantIds}
          />
        </TabsContent>

        <TabsContent value="correlation" className="mt-2" data-slot="analysis-tab-content">
          <CorrelationTab
            studyId={studyId}
            flowQuestions={flowQuestions}
            flowResponses={flowResponses}
            participants={participants}
            filteredParticipantIds={filteredParticipantIds}
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
    </div>
  )
}

/**
 * Memoized Survey Analysis Tab - prevents re-renders when switching between main tabs
 */
export const SurveyAnalysisTab = memo(SurveyAnalysisTabBase, (prev, next) => {
  return (
    prev.studyId === next.studyId &&
    prev.flowQuestions === next.flowQuestions &&
    prev.flowResponses === next.flowResponses &&
    prev.participants === next.participants &&
    prev.initialSubTab === next.initialSubTab
  )
})
