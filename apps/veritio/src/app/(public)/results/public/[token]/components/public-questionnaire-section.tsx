'use client'

/**
 * Public Questionnaire Section
 *
 * Read-only version of the questionnaire responses for public results sharing.
 * Displays screening, pre-study, and post-study questions with visualizations.
 */

import { useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HelpCircle } from 'lucide-react'
import { QuestionDisplay } from '@/components/analysis/card-sort/questionnaire/question-display'
import type { StudyFlowQuestionRow, StudyFlowResponseRow, Participant } from '@veritio/study-types'
import type { FlowSection } from '@veritio/study-types/study-flow-types'

interface PublicQuestionnaireSectionProps {
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  participants: Participant[]
}

const SECTION_ORDER: FlowSection[] = ['screening', 'pre_study', 'post_study']

const SECTION_LABELS: Record<FlowSection, string> = {
  screening: 'Screening Questions',
  pre_study: 'Pre-Study Questions',
  post_study: 'Post-Study Questions',
  survey: 'Survey Questions',
}

export function PublicQuestionnaireSection({
  flowQuestions,
  flowResponses,
  participants,
}: PublicQuestionnaireSectionProps) {
  // Group questions by section
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

    // Sort questions by position within each section
    for (const section of Object.keys(grouped) as FlowSection[]) {
      grouped[section].sort((a, b) => a.position - b.position)
    }

    return grouped
  }, [flowQuestions])

  // Get sections that have questions (only screening, pre_study, post_study - not survey)
  const sectionsWithQuestions = useMemo(() => {
    return SECTION_ORDER.filter(section => questionsBySection[section].length > 0)
  }, [questionsBySection])

  // Active tab state - default to first section with questions
  const [activeSection, setActiveSection] = useState<FlowSection>(
    sectionsWithQuestions[0] || 'screening'
  )

  // No questions at all
  if (sectionsWithQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-muted-foreground">
          <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No questionnaire data</h3>
          <p className="text-sm max-w-md">
            This study doesn&apos;t have any screening, pre-study, or post-study questions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as FlowSection)}>
      <TabsList variant="underline" className="mb-4">
        {sectionsWithQuestions.map(section => (
          <TabsTrigger key={section} variant="underline" value={section}>
            {SECTION_LABELS[section]}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Tab content for each section */}
      {sectionsWithQuestions.map(section => (
        <TabsContent key={section} value={section} className="mt-0">
          <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
            <div className="space-y-0">
              {questionsBySection[section].map((question, index) => (
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
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
