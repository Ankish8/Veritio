'use client'

/**
 * Results View Components
 *
 * Extracted view components for different study types in public results.
 */

import dynamic from 'next/dynamic'
import { Users, Clock, BarChart3, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuestionDisplay } from '@/components/analysis/card-sort/questionnaire/question-display'
import { PublicSurveyOverview } from './public-survey-overview'
import { PublicQuestionnaireSection } from './public-questionnaire-section'

// Heavy analysis components — only loaded when their tab is active
const CrossTabulationTab = dynamic(
  () => import('@/components/analysis/survey/cross-tabulation').then(m => ({ default: m.CrossTabulationTab })),
  { loading: () => <div className="flex items-center justify-center py-16"><div className="animate-pulse text-muted-foreground">Loading cross-tabulation...</div></div> }
)
const CorrelationTab = dynamic(
  () => import('@/components/analysis/survey/correlation').then(m => ({ default: m.CorrelationTab })),
  { loading: () => <div className="flex items-center justify-center py-16"><div className="animate-pulse text-muted-foreground">Loading correlation...</div></div> }
)

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Overview Stats Component
 */
export function OverviewStats({ data }: { data: any }) {
  if (!data.overview) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Total Participants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.overview.totalParticipants}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Completed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.overview.completedParticipants}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            Completion Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data.overview.completionRate}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Avg. Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {formatDuration(data.overview.averageDurationSeconds)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Survey Questions View - Shows all survey questions with visualizations
 */
export function SurveyQuestionsView({
  flowQuestions,
  flowResponses,
  participants,
}: {
  flowQuestions: any[]
  flowResponses: any[]
  participants: any[]
}) {
  // Filter to only survey questions and sort by position
  const surveyQuestions = flowQuestions
    .filter((q: any) => q.section === 'survey')
    .sort((a: any, b: any) => a.position - b.position)

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
      {surveyQuestions.map((question: any, index: number) => (
        <QuestionDisplay
          key={question.id}
          question={question}
          responses={flowResponses}
          participants={participants}
          questionIndex={index + 1}
          filteredParticipantIds={null}
          hideEmptyResponses={false}
          flowQuestions={flowQuestions}
          flowResponses={flowResponses}
        />
      ))}
    </div>
  )
}

/**
 * Survey Results View - Flat tab structure
 * Tabs: Overview, Questions, Cross-Tabulation, Correlation
 */
export function SurveyResultsView({
  data,
  fullResults,
  showOverview,
  showAnalysis,
  showQuestionnaire,
}: {
  data: any
  fullResults: any
  showOverview: boolean
  showAnalysis: boolean
  showQuestionnaire: boolean
}) {
  const flowQuestions = fullResults.flowQuestions || []
  const flowResponses = fullResults.flowResponses || []
  const participants = fullResults.participants || []

  // Count survey questions
  const surveyQuestionCount = flowQuestions.filter((q: any) => q.section === 'survey').length
  const completedParticipants = participants.filter((p: any) => p.status === 'completed').length

  // Determine default tab
  const defaultTab = showOverview ? 'overview' : 'questions'

  return (
    <Tabs defaultValue={defaultTab} className="space-y-6">
      <TabsList variant="underline">
        {showOverview && <TabsTrigger variant="underline" value="overview">Overview</TabsTrigger>}
        {showAnalysis && (
          <>
            <TabsTrigger variant="underline" value="questions">Questions</TabsTrigger>
            <TabsTrigger variant="underline" value="crosstab">Cross-Tabulation</TabsTrigger>
            <TabsTrigger variant="underline" value="correlation">Correlation</TabsTrigger>
          </>
        )}
        {showQuestionnaire && (
          <TabsTrigger variant="underline" value="questionnaire">Questionnaire</TabsTrigger>
        )}
      </TabsList>

      {/* Overview Tab */}
      {showOverview && (
        <TabsContent value="overview" className="space-y-6">
          <PublicSurveyOverview
            stats={{
              totalParticipants: data.overview?.totalParticipants || participants.length,
              completedParticipants: data.overview?.completedParticipants || completedParticipants,
              avgCompletionTimeMs: (data.overview?.averageDurationSeconds || 0) * 1000,
            }}
            participants={participants}
            flowQuestions={flowQuestions}
            flowResponses={flowResponses}
          />
        </TabsContent>
      )}

      {/* Questions Tab */}
      {showAnalysis && (
        <TabsContent value="questions" className="space-y-4">
          <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
            <div className="text-sm text-muted-foreground mb-4">
              Analyzing <span className="font-medium text-foreground">{surveyQuestionCount} survey questions</span> from{' '}
              <span className="font-medium text-foreground">{completedParticipants} completed responses</span>
            </div>
            <SurveyQuestionsView
              flowQuestions={flowQuestions}
              flowResponses={flowResponses}
              participants={participants}
            />
          </div>
        </TabsContent>
      )}

      {/* Cross-Tabulation Tab */}
      {showAnalysis && (
        <TabsContent value="crosstab" className="space-y-4">
          <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
            <CrossTabulationTab
              studyId={data.study.id}
              flowQuestions={flowQuestions}
              flowResponses={flowResponses}
              participants={participants}
              filteredParticipantIds={null}
            />
          </div>
        </TabsContent>
      )}

      {/* Correlation Tab */}
      {showAnalysis && (
        <TabsContent value="correlation" className="space-y-4">
          <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
            <CorrelationTab
              studyId={data.study.id}
              flowQuestions={flowQuestions}
              flowResponses={flowResponses}
              participants={participants}
              filteredParticipantIds={null}
            />
          </div>
        </TabsContent>
      )}

      {/* Questionnaire Tab - Shows screening, pre-study, post-study questions */}
      {showQuestionnaire && (
        <TabsContent value="questionnaire" className="space-y-4">
          <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
            <PublicQuestionnaireSection
              flowQuestions={flowQuestions}
              flowResponses={flowResponses}
              participants={participants}
            />
          </div>
        </TabsContent>
      )}
    </Tabs>
  )
}
