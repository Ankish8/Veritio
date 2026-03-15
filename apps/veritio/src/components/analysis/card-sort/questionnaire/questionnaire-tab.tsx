'use client'

import { useState, useMemo } from 'react'
import { useAuthFetch } from '@/hooks'
import { useSurveyFlowResponses } from '@/hooks/use-survey-flow-responses'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, ChevronUp, Check, Plus, List, HelpCircle, EyeOff } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useSegment } from '@/contexts/segment-context'
import { QuestionnaireSplitLayout } from './questionnaire-split-layout'
import { CreateSegmentModal } from '../participants/create-segment-modal'
import { PostTaskQuestionsSection } from '../../shared/post-task-questions-section'
import type { PostTaskData } from '../../shared/post-task-data-normalizer'
import type { Participant, StudyFlowQuestionRow, StudyFlowResponseRow, SegmentConditionsV2 } from '@veritio/study-types'
import type { FlowSection } from '@veritio/study-types/study-flow-types'

type QuestionnaireSection = FlowSection | 'post_task'

interface QuestionnaireTabProps {
  studyId: string
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  participants: Participant[]
  postTaskData?: PostTaskData | null
  /** Callback to navigate to the Segments section in Participants tab */
  onNavigateToSegments?: () => void
  /** Callback when the active section changes (for notes panel context) */
  onSectionChange?: (section: FlowSection) => void
}

const FLOW_SECTION_ORDER: FlowSection[] = ['screening', 'pre_study', 'post_study']

const SECTION_LABELS: Record<QuestionnaireSection, string> = {
  post_task: 'Post-task questions',
  screening: 'Screening questions',
  pre_study: 'Pre-study questions',
  post_study: 'Post-study questions',
  survey: 'Survey questions',
}

export function QuestionnaireTab({
  studyId,
  flowQuestions,
  flowResponses: initialFlowResponses,
  participants,
  postTaskData,
  onNavigateToSegments,
  onSectionChange,
}: QuestionnaireTabProps) {
  const [segmentDropdownOpen, setSegmentDropdownOpen] = useState(false)
  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false)
  const [hideEmptyResponses, setHideEmptyResponses] = useState(false)

  const authFetch = useAuthFetch()

  const { flowResponses: lazyFlowResponses } = useSurveyFlowResponses(
    initialFlowResponses.length === 0 ? studyId : null
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

  const hasPostTaskData = !!postTaskData && postTaskData.tasks.length > 0

  const questionsBySection = useMemo(() => {
    const grouped: Record<FlowSection, StudyFlowQuestionRow[]> = {
      screening: [],
      pre_study: [],
      post_study: [],
      survey: [],
    }

    for (const question of flowQuestions) {
      const section = question.section as FlowSection
      if (grouped[section]) {
        grouped[section].push(question)
      }
    }

    for (const section of Object.keys(grouped) as FlowSection[]) {
      grouped[section].sort((a, b) => a.position - b.position)
    }

    return grouped
  }, [flowQuestions])

  const sectionsWithQuestions = useMemo<QuestionnaireSection[]>(() => {
    const flowSections = FLOW_SECTION_ORDER.filter(section => questionsBySection[section].length > 0)
    // Post-task questions appear first when present
    if (hasPostTaskData) {
      return ['post_task' as QuestionnaireSection, ...flowSections]
    }
    return flowSections
  }, [questionsBySection, hasPostTaskData])

  const [activeSection, setActiveSection] = useState<QuestionnaireSection>(
    sectionsWithQuestions[0] || 'screening'
  )

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

  if (sectionsWithQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-muted-foreground">
          <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No questionnaire data</h3>
          <p className="text-sm max-w-md">
            This study doesn&apos;t have any post-task, screening, pre-study, or post-study questions configured.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Tabs value={activeSection} onValueChange={(v) => {
        const section = v as QuestionnaireSection
        setActiveSection(section)
        if (section !== 'post_task') {
          onSectionChange?.(section as FlowSection)
        }
      }}>
        <div className="sticky top-0 z-10 bg-background pb-4 -mx-6 px-6 pt-1 border-b border-transparent [&:not(:first-child)]:border-border">
          <div className="flex items-center justify-between">
            <TabsList variant="underline">
              {sectionsWithQuestions.map(section => (
                <TabsTrigger key={section} variant="underline" value={section}>
                  {SECTION_LABELS[section]}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex items-center gap-3">
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
                <DropdownMenuSeparator />
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
          </div>
        </div>

        {hasPostTaskData && postTaskData && (
          <TabsContent key="post_task" value="post_task" className="mt-0">
            <PostTaskQuestionsSection
              postTaskData={postTaskData}
              participants={participants}
              filteredParticipantIds={filteredParticipantIds}
              hideEmptyResponses={hideEmptyResponses}
              studyId={studyId}
            />
          </TabsContent>
        )}

        {sectionsWithQuestions.filter(s => s !== 'post_task').map(section => (
          <TabsContent key={section} value={section} className="mt-0">
            <QuestionnaireSplitLayout
              studyId={studyId}
              section={section as FlowSection}
              questions={questionsBySection[section as FlowSection]}
              responses={flowResponses}
              participants={participants}
              filteredParticipantIds={filteredParticipantIds}
              hideEmptyResponses={hideEmptyResponses}
            />
          </TabsContent>
        ))}
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
