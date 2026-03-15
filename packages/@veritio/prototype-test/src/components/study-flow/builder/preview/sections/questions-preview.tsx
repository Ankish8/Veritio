'use client'

import { PreviewLayout, PreviewButton } from '../preview-layout'
import { PreviewQuestionRenderer } from '../preview-question-renderer'
import type { StudyFlowQuestion, StudyFlowSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'

type QuestionSection = 'screening' | 'pre_study' | 'post_study' | 'survey'

interface QuestionsPreviewProps {
  section: QuestionSection
  questions: StudyFlowQuestion[]
  flowSettings: StudyFlowSettings
  selectedQuestionId?: string | null
}

export function QuestionsPreview({
  section,
  questions,
  flowSettings,
  selectedQuestionId,
}: QuestionsPreviewProps) {
  // Get section-specific settings
  const getSectionSettings = () => {
    switch (section) {
      case 'screening':
        return {
          introTitle: flowSettings.screening.introTitle,
          introMessage: flowSettings.screening.introMessage,
          showIntro: true, // Screening always shows intro
        }
      case 'pre_study':
        return {
          introTitle: flowSettings.preStudyQuestions.introTitle,
          introMessage: flowSettings.preStudyQuestions.introMessage,
          showIntro: flowSettings.preStudyQuestions.showIntro !== false,
        }
      case 'post_study':
        return {
          introTitle: flowSettings.postStudyQuestions.introTitle,
          introMessage: flowSettings.postStudyQuestions.introMessage,
          showIntro: flowSettings.postStudyQuestions.showIntro !== false,
        }
      case 'survey':
        return {
          introTitle: flowSettings.surveyQuestionnaire?.introTitle,
          introMessage: flowSettings.surveyQuestionnaire?.introMessage,
          showIntro: flowSettings.surveyQuestionnaire?.showIntro !== false,
        }
    }
  }

  const settings = getSectionSettings()
  const getSectionTitle = () => {
    switch (section) {
      case 'screening':
        return 'Screening Questions'
      case 'pre_study':
        return 'Pre-Study Questions'
      case 'post_study':
        return 'Post-Study Questions'
      case 'survey':
        return 'Survey Questions'
    }
  }

  // If showing the intro view - show intro title/subtitle WITH the first question
  // This mirrors the actual participant experience where the section header
  // appears at the top of the same screen as the questions
  if (selectedQuestionId === 'intro') {
    const firstQuestion = questions[0]
    return (
      <PreviewLayout
        title={settings.introTitle || getSectionTitle()}
        subtitle={settings.introMessage}
        actions={
          <div className="flex justify-end">
            <PreviewButton>Continue</PreviewButton>
          </div>
        }
      >
        {firstQuestion ? (
          <>
            {/* Divider between header and question - only when subtitle exists */}
            {settings.introMessage && (
              <div className="border-t border-stone-200 -mx-5 mb-4" />
            )}
            <PreviewQuestionRenderer question={firstQuestion} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No questions added yet
          </p>
        )}
      </PreviewLayout>
    )
  }

  // If showing the rejection view (screening only)
  if (selectedQuestionId === 'rejection' && section === 'screening') {
    return (
      <PreviewLayout
        title={flowSettings.screening.rejectionTitle || 'Not Eligible'}
        centered
      >
        {flowSettings.screening.rejectionMessage ? (
          <div
            className="prose prose-stone prose-sm max-w-none text-stone-600
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
              [&_li]:my-1
              [&_p]:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: flowSettings.screening.rejectionMessage }}
          />
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No rejection message configured
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          (Shown when participant fails screening)
        </p>
      </PreviewLayout>
    )
  }

  // If a specific question is selected, show just the question
  // Header is intentionally hidden to give full visual focus to the question
  // (Header is shown when 'intro' item is selected instead)
  if (selectedQuestionId && selectedQuestionId !== 'intro' && selectedQuestionId !== 'rejection') {
    const selectedQuestion = questions.find((q) => q.id === selectedQuestionId)

    if (!selectedQuestion) {
      return (
        <PreviewLayout>
          <p className="text-sm text-muted-foreground italic">
            Question not found
          </p>
        </PreviewLayout>
      )
    }

    return (
      <PreviewLayout
        actions={
          <div className="flex justify-end">
            <PreviewButton>Continue</PreviewButton>
          </div>
        }
      >
        <PreviewQuestionRenderer question={selectedQuestion} />
      </PreviewLayout>
    )
  }

  // Default: show all questions or empty state
  if (questions.length === 0) {
    return (
      <PreviewLayout title={getSectionTitle()}>
        <div className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            No questions added yet
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Add questions in the editor to see them here
          </p>
        </div>
      </PreviewLayout>
    )
  }

  // Show all questions in a scrollable list with section header (if showIntro is enabled)
  const showHeader = settings.showIntro

  return (
    <PreviewLayout
      title={showHeader ? (settings.introTitle || getSectionTitle()) : getSectionTitle()}
      subtitle={showHeader ? settings.introMessage : undefined}
      actions={
        <div className="flex justify-end">
          <PreviewButton>Continue</PreviewButton>
        </div>
      }
    >
      {/* Divider between header and questions - only when intro subtitle is shown */}
      {showHeader && settings.introMessage && (
        <div className="border-t border-stone-200 -mx-5 mb-4" />
      )}
      <div className="space-y-6">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className={index > 0 ? 'pt-6 border-t border-stone-200' : ''}
          >
            <PreviewQuestionRenderer question={question} />
          </div>
        ))}
      </div>
    </PreviewLayout>
  )
}
