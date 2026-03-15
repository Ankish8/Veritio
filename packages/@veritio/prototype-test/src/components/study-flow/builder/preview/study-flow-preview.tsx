'use client'

import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { BrowserFrame } from '@veritio/ui/components/browser-frame'
import { PreviewBanner } from './preview-banner'
import { WelcomePreview } from './sections/welcome-preview'
import { AgreementPreview } from './sections/agreement-preview'
import { IdentifierPreview } from './sections/identifier-preview'
import { QuestionsPreview } from './sections/questions-preview'
import { InstructionsPreview } from './sections/instructions-preview'
import { TreeTestInteractivePreview } from './sections/tree-test-interactive-preview'
import { ThankYouPreview } from './sections/thank-you-preview'
import { ClosedPreview } from './sections/closed-preview'

interface StudyFlowPreviewProps {
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  studyId: string
}
export function StudyFlowPreview({ studyType, studyId }: StudyFlowPreviewProps) {
  // Subscribe to builder store for live updates
  const activeFlowSection = useStudyFlowBuilderStore((state) => state.activeFlowSection)
  const selectedQuestionId = useStudyFlowBuilderStore((state) => state.selectedQuestionId)
  const selectedDemographicSectionId = useStudyFlowBuilderStore((state) => state.selectedDemographicSectionId)
  const flowSettings = useStudyFlowBuilderStore((state) => state.flowSettings)
  const screeningQuestions = useStudyFlowBuilderStore((state) => state.screeningQuestions)
  const preStudyQuestions = useStudyFlowBuilderStore((state) => state.preStudyQuestions)
  const postStudyQuestions = useStudyFlowBuilderStore((state) => state.postStudyQuestions)
  const surveyQuestions = useStudyFlowBuilderStore((state) => state.surveyQuestions)
  const isHydrated = useStudyFlowBuilderStore((state) => state.isHydrated)

  // Wait for hydration
  if (!isHydrated) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-50">
        <p className="text-sm text-muted-foreground">Loading preview...</p>
      </div>
    )
  }

  // Render the appropriate preview based on active section
  const renderPreview = () => {
    switch (activeFlowSection) {
      case 'welcome':
        return <WelcomePreview settings={flowSettings.welcome} studyId={studyId} />

      case 'agreement':
        return <AgreementPreview settings={flowSettings.participantAgreement} />

      case 'screening':
        return (
          <QuestionsPreview
            section="screening"
            questions={screeningQuestions}
            flowSettings={flowSettings}
            selectedQuestionId={selectedQuestionId}
          />
        )

      case 'identifier':
        return (
          <IdentifierPreview
            settings={flowSettings.participantIdentifier}
            selectedSectionId={selectedDemographicSectionId}
          />
        )

      case 'pre_study':
        return (
          <QuestionsPreview
            section="pre_study"
            questions={preStudyQuestions}
            flowSettings={flowSettings}
            selectedQuestionId={selectedQuestionId}
          />
        )

      case 'instructions':
        // For tree test, show fully interactive preview
        // This allows users to experience the complete tree navigation
        if (studyType === 'tree_test') {
          return (
            <TreeTestInteractivePreview
              studyId={studyId}
              settings={flowSettings.activityInstructions}
            />
          )
        }

        // For other study types, show instructions preview only
        return (
          <InstructionsPreview
            settings={flowSettings.activityInstructions}
            studyType={studyType}
          />
        )

      case 'post_study':
        return (
          <QuestionsPreview
            section="post_study"
            questions={postStudyQuestions}
            flowSettings={flowSettings}
            selectedQuestionId={selectedQuestionId}
          />
        )

      case 'survey':
        return (
          <QuestionsPreview
            section="survey"
            questions={surveyQuestions}
            flowSettings={flowSettings}
            selectedQuestionId={selectedQuestionId}
          />
        )

      case 'thank_you':
        return <ThankYouPreview settings={flowSettings.thankYou} studyId={studyId} />

      case 'closed':
        return <ClosedPreview settings={flowSettings.closedStudy} />

      default:
        return (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Select a section to preview
            </p>
          </div>
        )
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <PreviewBanner />
      <div className="flex-1 flex items-center justify-center overflow-hidden p-6">
        {/* Responsive preview frame - adapts to container width */}
        <BrowserFrame
          url="preview · veritio.io/study"
          showPreviewBadge
          style={{
            width: 'clamp(300px, 100%, 380px)',
            height: '100%',
          }}
        >
          {renderPreview()}
        </BrowserFrame>
      </div>
    </div>
  )
}
