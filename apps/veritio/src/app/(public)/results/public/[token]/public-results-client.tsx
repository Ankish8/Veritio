'use client'

import './public-results.css'

import dynamic from 'next/dynamic'
import { FileText, HelpCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ThemeProvider } from '@/components/study-flow/player/theme-provider'
import { BrandingProvider } from '@/components/study-flow/player/branding-provider'
import type { BrandingSettings } from '@/components/builders/shared/types'

// ── Lightweight components imported eagerly (small, used everywhere) ──
import { OverviewStats } from './components/results-views'

// ── Per-study-type dynamic imports ──
// Only the components needed for the current study type are downloaded.
// Turbopack requires each dynamic() call to have an inline object literal for options.

// Overview components
const PublicCardSortOverview = dynamic(() => import('./components/public-card-sort-overview').then(m => ({ default: m.PublicCardSortOverview })))
const PublicTreeTestOverview = dynamic(() => import('./components/public-tree-test-overview').then(m => ({ default: m.PublicTreeTestOverview })))
const PublicPrototypeTestOverview = dynamic(() => import('./components/public-prototype-test-overview').then(m => ({ default: m.PublicPrototypeTestOverview })))
const PublicFirstClickOverview = dynamic(() => import('./components/public-first-click-overview').then(m => ({ default: m.PublicFirstClickOverview })))
const PublicFirstImpressionOverview = dynamic(() => import('./components/public-first-impression-overview').then(m => ({ default: m.PublicFirstImpressionOverview })))

// Analysis components
const PublicCardSortAnalysis = dynamic(() => import('./components/public-card-sort-analysis').then(m => ({ default: m.PublicCardSortAnalysis })))
const PublicTreeTestAnalysis = dynamic(() => import('./components/public-tree-test-analysis').then(m => ({ default: m.PublicTreeTestAnalysis })))
const PublicSurveyAnalysis = dynamic(() => import('./components/public-survey-analysis').then(m => ({ default: m.PublicSurveyAnalysis })))
const PublicPrototypeTestAnalysis = dynamic(() => import('./components/public-prototype-test-analysis').then(m => ({ default: m.PublicPrototypeTestAnalysis })))
const PublicFirstClickAnalysis = dynamic(() => import('./components/public-first-click-analysis').then(m => ({ default: m.PublicFirstClickAnalysis })))
const PublicFirstImpressionAnalysis = dynamic(() => import('./components/public-first-impression-analysis').then(m => ({ default: m.PublicFirstImpressionAnalysis })))

// Shared components
const PublicQuestionnaireSection = dynamic(() => import('./components/public-questionnaire-section').then(m => ({ default: m.PublicQuestionnaireSection })))
const PublicInsightsSection = dynamic(() => import('./components/public-insights-section').then(m => ({ default: m.PublicInsightsSection })))

// Full study-type views (survey has its own tab structure, live website is complex)
const SurveyResultsView = dynamic(() => import('./components/results-views').then(m => ({ default: m.SurveyResultsView })))
const PublicLiveWebsiteResults = dynamic(
  () => import('./components/public-live-website-results')
)

/**
 * PublicResultsClient - Renders authenticated public study results
 *
 * Password gate and error states are handled by separate lightweight components
 * in page.tsx to avoid loading heavy analysis bundles for those screens.
 */

interface PublicResultsClientProps {
  token: string
  branding?: Record<string, unknown>
  /** When true, skip ThemeProvider/BrandingProvider/header/footer — rendered by server shell */
  contentOnly?: boolean
  data: {
    study: {
      id: string
      title: string
      type: string
    }
    overview?: {
      totalParticipants: number
      completedParticipants: number
      completionRate: string
      averageDurationSeconds: number
    } | null
    participantCount?: number | null
    sharedMetrics: {
      overview: boolean
      participants: boolean
      analysis: boolean
      questionnaire: boolean
      aiInsights?: boolean
    }
    fullResults?: any // Full results data for analysis and questionnaire
  }
}

function formatStudyType(type: string): string {
  const typeMap: Record<string, string> = {
    card_sort: 'Card Sort',
    tree_test: 'Tree Test',
    survey: 'Survey',
    prototype_test: 'Figma Prototype Test',
    first_click: 'First Click',
    first_impression: 'First Impression',
    live_website_test: 'Web App Test',
  }
  return typeMap[type] || type
}

/**
 * Render analysis section based on study type
 */
function AnalysisSection({
  studyId,
  studyType,
  fullResults,
}: {
  studyId: string
  studyType: string
  fullResults: any
}) {
  switch (studyType) {
    case 'card_sort':
      return (
        <PublicCardSortAnalysis
          cards={fullResults.cards || []}
          categories={fullResults.categories || []}
          responses={fullResults.responses || []}
          participants={fullResults.participants || []}
          standardizations={fullResults.standardizations || []}
          analysis={fullResults.analysis}
          mode={fullResults.study?.settings?.mode || 'open'}
        />
      )

    case 'tree_test':
      return (
        <PublicTreeTestAnalysis
          studyId={studyId}
          tasks={fullResults.tasks || []}
          nodes={fullResults.nodes || []}
          responses={fullResults.responses || []}
          participants={fullResults.participants || []}
          metrics={fullResults.metrics || { taskMetrics: [] }}
        />
      )

    case 'survey':
      return (
        <PublicSurveyAnalysis
          studyId={studyId}
          flowQuestions={fullResults.flowQuestions || []}
          flowResponses={fullResults.flowResponses || []}
          participants={fullResults.participants || []}
        />
      )

    case 'prototype_test':
      return (
        <PublicPrototypeTestAnalysis
          tasks={fullResults.tasks || []}
          taskMetrics={fullResults.taskMetrics || []}
          participants={fullResults.participants || []}
        />
      )

    case 'first_click':
      return (
        <PublicFirstClickAnalysis
          tasks={fullResults.tasks || []}
          metrics={fullResults.metrics || { taskMetrics: [] }}
          participants={fullResults.participants || []}
        />
      )

    case 'first_impression':
      return (
        <PublicFirstImpressionAnalysis
          designs={fullResults.designs || []}
          sessions={fullResults.sessions || []}
          exposures={fullResults.exposures || []}
          participants={fullResults.participants || []}
          metrics={fullResults.metrics || {}}
        />
      )

    default:
      return (
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Analysis Not Available</h3>
              <p className="text-sm max-w-md">
                Analysis is not available for this study type.
              </p>
            </div>
          </div>
        </div>
      )
  }
}

/**
 * Render questionnaire section based on study type
 */
function QuestionnaireSection({
  studyType,
  fullResults,
}: {
  studyType: string
  fullResults: any
}) {
  // For surveys, the questionnaire is the main analysis
  if (studyType === 'survey') {
    return (
      <PublicQuestionnaireSection
        flowQuestions={fullResults.flowQuestions || []}
        flowResponses={fullResults.flowResponses || []}
        participants={fullResults.participants || []}
      />
    )
  }

  // For other study types, show pre/post study questions
  const flowQuestions = fullResults.flowQuestions || []
  const flowResponses = fullResults.flowResponses || []
  const participants = fullResults.participants || []

  // Check if there are any non-survey questions
  const hasQuestionnaireQuestions = flowQuestions.some(
    (q: any) => q.section !== 'survey'
  )

  if (!hasQuestionnaireQuestions) {
    return (
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Questionnaire Data</h3>
            <p className="text-sm max-w-md">
              This study doesn&apos;t have any screening, pre-study, or post-study questions.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PublicQuestionnaireSection
      flowQuestions={flowQuestions}
      flowResponses={flowResponses}
      participants={participants}
    />
  )
}

/**
 * Render study-type-specific overview section
 */
function OverviewSection({
  data,
  fullResults,
}: {
  data: any
  fullResults: any
}) {
  const studyType = data.study.type
  const participants = fullResults.participants || []
  const completedParticipants = participants.filter((p: any) => p.status === 'completed').length

  switch (studyType) {
    case 'card_sort':
      return (
        <PublicCardSortOverview
          stats={{
            totalParticipants: data.overview?.totalParticipants || participants.length,
            completedParticipants: data.overview?.completedParticipants || completedParticipants,
            avgCompletionTimeMs: (data.overview?.averageDurationSeconds || 0) * 1000,
          }}
          responses={fullResults.responses || []}
          participants={participants}
          cards={fullResults.cards || []}
          standardizations={fullResults.standardizations || []}
        />
      )

    case 'tree_test':
      return (
        <PublicTreeTestOverview
          metrics={fullResults.metrics || {
            totalParticipants: participants.length,
            completedParticipants,
            completionRate: participants.length > 0 ? (completedParticipants / participants.length) * 100 : 0,
            overallSuccessRate: 0,
            overallDirectnessRate: 0,
            overallDirectSuccessRate: 0,
            overallScore: 0,
            overallFindabilityGrade: 'F',
            overallFindabilityGradeDescription: 'No data',
            averageCompletionTimeMs: 0,
            overallLostness: 0,
            overallLostnessStatus: 'low',
            overallLostnessDescription: 'No data',
            taskMetrics: [],
          }}
          responses={fullResults.responses || []}
          participants={participants}
          tasks={fullResults.tasks || []}
          nodes={fullResults.nodes || []}
        />
      )

    case 'prototype_test':
      return (
        <PublicPrototypeTestOverview
          metrics={fullResults.metrics || {
            totalParticipants: participants.length,
            completedParticipants,
            completionRate: participants.length > 0 ? (completedParticipants / participants.length) * 100 : 0,
            averageCompletionTimeMs: (data.overview?.averageDurationSeconds || 0) * 1000,
            overallSuccessRate: 0,
            overallDirectRate: 0,
            averageClickCount: 0,
            averageMisclickRate: 0,
          }}
          participants={participants}
          taskMetrics={fullResults.taskMetrics || []}
        />
      )

    case 'first_click':
      return (
        <PublicFirstClickOverview
          metrics={fullResults.metrics || {
            totalParticipants: participants.length,
            completedParticipants,
            abandonedParticipants: participants.length - completedParticipants,
            averageCompletionTimeMs: (data.overview?.averageDurationSeconds || 0) * 1000,
            overallSuccessRate: 0,
            taskMetrics: [],
          }}
          participants={participants}
          responses={fullResults.responses || []}
        />
      )

    case 'first_impression':
      return (
        <PublicFirstImpressionOverview
          metrics={fullResults.metrics || {
            totalParticipants: participants.length,
            completedParticipants,
            completionRate: participants.length > 0 ? (completedParticipants / participants.length) * 100 : 0,
            averageSessionTimeMs: (data.overview?.averageDurationSeconds || 0) * 1000,
            designMetrics: [],
          }}
          participants={participants}
          sessions={fullResults.sessions || []}
          exposures={fullResults.exposures || []}
          designs={fullResults.designs || []}
          responses={fullResults.responses || []}
        />
      )

    default:
      // Fallback to basic overview stats for other study types
      return <OverviewStats data={data} />
  }
}

/**
 * Other Study Results View - Card Sort, Tree Test, etc.
 * Tabs: Overview, Analysis (with sub-tabs), Questionnaire
 */
function OtherStudyResultsView({
  data,
  fullResults,
  showOverview,
  showAnalysis,
  showQuestionnaire,
  showAiInsights,
  token,
}: {
  data: any
  fullResults: any
  showOverview: boolean
  showAnalysis: boolean
  showQuestionnaire: boolean
  showAiInsights: boolean
  token: string
}) {
  const defaultTab = showOverview ? 'overview' : showAnalysis ? 'analysis' : showQuestionnaire ? 'questionnaire' : 'ai-insights'

  return (
    <Tabs defaultValue={defaultTab} className="space-y-6">
      <TabsList variant="underline">
        {showOverview && <TabsTrigger variant="underline" value="overview">Overview</TabsTrigger>}
        {showAnalysis && <TabsTrigger variant="underline" value="analysis">Analysis</TabsTrigger>}
        {showQuestionnaire && <TabsTrigger variant="underline" value="questionnaire">Questionnaire</TabsTrigger>}
        {showAiInsights && <TabsTrigger variant="underline" value="ai-insights">AI Insights</TabsTrigger>}
      </TabsList>

      {/* Overview Tab - Study-type-specific rich overview */}
      {showOverview && (
        <TabsContent value="overview" className="space-y-6">
          <OverviewSection data={data} fullResults={fullResults} />
        </TabsContent>
      )}

      {/* Analysis Tab */}
      {showAnalysis && (
        <TabsContent value="analysis" className="space-y-6">
          <AnalysisSection
            studyId={data.study.id}
            studyType={data.study.type}
            fullResults={fullResults}
          />
        </TabsContent>
      )}

      {/* Questionnaire Tab */}
      {showQuestionnaire && (
        <TabsContent value="questionnaire" className="space-y-6">
          <QuestionnaireSection
            studyType={data.study.type}
            fullResults={fullResults}
          />
        </TabsContent>
      )}

      {/* AI Insights Tab */}
      {showAiInsights && fullResults.insightsReport && (
        <TabsContent value="ai-insights" className="space-y-6">
          <PublicInsightsSection
            reportData={fullResults.insightsReport.report_data}
            reportId={fullResults.insightsReport.id}
            hasFilePath={!!fullResults.insightsReport.file_path}
            token={token}
          />
        </TabsContent>
      )}
    </Tabs>
  )
}

export function PublicResultsClient({
  token,
  branding,
  data,
  contentOnly,
}: PublicResultsClientProps) {
  const brandingSettings = (branding || {}) as BrandingSettings
  const logoUrl = brandingSettings.logo?.url
  const logoSize = brandingSettings.logoSize || 48

  const fullResults = data.fullResults
  const studyType = data.study.type
  const hasAnalysis = data.sharedMetrics.analysis && fullResults
  const hasQuestionnaire = data.sharedMetrics.questionnaire && fullResults

  // Determine which tabs to show
  const showOverview = data.sharedMetrics.overview
  const showAnalysis = hasAnalysis

  // For surveys: show Questionnaire tab only if there are non-survey questions (screening, pre, post)
  // For other types: show if there are any flow questions
  const hasNonSurveyQuestions = fullResults?.flowQuestions?.some(
    (q: any) => q.section !== 'survey'
  )
  const showQuestionnaire = hasQuestionnaire && (
    studyType === 'survey'
      ? hasNonSurveyQuestions
      : (fullResults?.flowQuestions?.length > 0)
  )

  // Build tabs list based on study type
  // For surveys: flat structure (Overview, Questions, Cross-Tabulation, Correlation)
  // For other types: Overview, Analysis (with sub-tabs), Questionnaire
  const isSurvey = studyType === 'survey'
  const isLiveWebsite = studyType === 'live_website_test'
  const showAiInsights = data.sharedMetrics.aiInsights === true && !!fullResults?.insightsReport

  const tabContent = isSurvey ? (
    <SurveyResultsView
      data={data}
      fullResults={fullResults}
      showOverview={showOverview}
      showAnalysis={showAnalysis}
      showQuestionnaire={showQuestionnaire}
    />
  ) : isLiveWebsite ? (
    <PublicLiveWebsiteResults
      data={data}
      fullResults={fullResults}
      showOverview={showOverview}
      showAnalysis={showAnalysis}
      showQuestionnaire={showQuestionnaire}
      showAiInsights={showAiInsights}
      token={token}
    />
  ) : (
    <OtherStudyResultsView
      data={data}
      fullResults={fullResults}
      showOverview={showOverview}
      showAnalysis={showAnalysis}
      showQuestionnaire={showQuestionnaire}
      showAiInsights={showAiInsights}
      token={token}
    />
  )

  // contentOnly: shell already renders providers + header + footer
  if (contentOnly) {
    return tabContent
  }

  return (
    <ThemeProvider themeMode={brandingSettings.themeMode}>
      <BrandingProvider branding={brandingSettings}>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <header className="sticky top-0 z-50 bg-card border-b">
            <div className="max-w-6xl mx-auto px-4 py-6">
              <div className="flex items-center gap-4">
                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- external branding URL
                  <img src={logoUrl} alt="Logo" className="object-contain" style={{ height: logoSize }} />
                )}
                <div>
                  <h1 className="text-xl font-bold text-foreground">{data.study.title}</h1>
                  <p className="text-sm text-muted-foreground">
                    {formatStudyType(studyType)} Results
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="max-w-6xl mx-auto px-4 py-8">
            {tabContent}

            {/* Footer */}
            <footer className="mt-12 text-center text-sm text-muted-foreground/60">
              <p>This is a read-only view of study results.</p>
            </footer>
          </main>
        </div>
      </BrandingProvider>
    </ThemeProvider>
  )
}
