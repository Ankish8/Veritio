'use client'

/**
 * Public Survey Analysis
 *
 * Read-only version of the Survey analysis for public results sharing.
 * Displays survey questions, cross-tabulation, and correlation without segment filtering.
 */

import { useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HelpCircle } from 'lucide-react'
import { QuestionDisplay } from '@/components/analysis/card-sort/questionnaire/question-display'
import { CrossTabulationTab } from '@/components/analysis/survey/cross-tabulation'
import { CorrelationTab } from '@/components/analysis/survey/correlation'
import type { StudyFlowQuestionRow, StudyFlowResponseRow, Participant } from '@veritio/study-types'

interface PublicSurveyAnalysisProps {
  studyId: string
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  participants: Participant[]
  initialTab?: 'questions' | 'crosstab' | 'correlation'
}

function SurveyQuestionsAnalysis({
  flowQuestions,
  flowResponses,
  participants,
}: {
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  participants: Participant[]
}) {
  // Filter to only survey questions and sort by position
  const surveyQuestions = useMemo(() => {
    return flowQuestions
      .filter(q => q.section === 'survey')
      .sort((a, b) => a.position - b.position)
  }, [flowQuestions])

  if (surveyQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-muted-foreground">
          <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No survey questions</h3>
          <p className="text-sm max-w-md">
            This survey doesn&apos;t have any questions configured.
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
          filteredParticipantIds={null} // Show all participants
          hideEmptyResponses={false}
          flowQuestions={flowQuestions}
          flowResponses={flowResponses}
        />
      ))}
    </div>
  )
}

export function PublicSurveyAnalysis({
  studyId,
  flowQuestions,
  flowResponses,
  participants,
  initialTab = 'questions',
}: PublicSurveyAnalysisProps) {
  const [activeTab, setActiveTab] = useState(initialTab)

  // Count survey questions and completed responses
  const surveyQuestionCount = flowQuestions.filter(q => q.section === 'survey').length
  const completedParticipants = participants.filter(p => p.status === 'completed').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-sm text-muted-foreground">
        Analyzing <span className="font-medium text-foreground">{surveyQuestionCount} survey questions</span> from{' '}
        <span className="font-medium text-foreground">{completedParticipants} completed responses</span>
      </div>

      {/* Analysis Sub-tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList variant="underline" className="mb-4">
          <TabsTrigger variant="underline" value="questions">Questions</TabsTrigger>
          <TabsTrigger variant="underline" value="crosstab">Cross-Tabulation</TabsTrigger>
          <TabsTrigger variant="underline" value="correlation">Correlation</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="mt-2">
          <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
            <SurveyQuestionsAnalysis
              flowQuestions={flowQuestions}
              flowResponses={flowResponses}
              participants={participants}
            />
          </div>
        </TabsContent>

        <TabsContent value="crosstab" className="mt-2">
          <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
            <CrossTabulationTab
              studyId={studyId}
              flowQuestions={flowQuestions}
              flowResponses={flowResponses}
              participants={participants}
              filteredParticipantIds={null} // Show all participants
            />
          </div>
        </TabsContent>

        <TabsContent value="correlation" className="mt-2">
          <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
            <CorrelationTab
              studyId={studyId}
              flowQuestions={flowQuestions}
              flowResponses={flowResponses}
              participants={participants}
              filteredParticipantIds={null} // Show all participants
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
