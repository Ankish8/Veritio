'use client'

import type { ReactNode } from 'react'
import type { ActiveFlowSection } from '@veritio/prototype-test/stores'
import { WelcomeSection } from './sections/welcome-section'
import { AgreementSection } from './sections/agreement-section'
import { ScreeningSection } from './sections/screening-section'
import { IdentifierSection } from './sections/identifier-section'
import { QuestionsSection } from './sections/questions-section'
import { InstructionsSection } from './sections/instructions-section'
import { PrototypeTestSettingsSection } from './sections/prototype-test-settings-section'
import { ThankYouSection } from './sections/thank-you-section'
import { ClosedSection } from './sections/closed-section'
import { SurveyQuestionnaireSection } from './sections/survey-questionnaire-section'

export interface SectionConfig {
  id: ActiveFlowSection
  title: string
  description: string
  enabledKey?: string
  component: ReactNode
  hasQuestions?: boolean
  isMainActivity?: boolean
  isSurveyActivity?: boolean
}

interface BuildSectionsProps {
  studyId: string
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  selectedDemographicSectionId: string | null
  setSelectedDemographicSectionId: (id: string | null) => void
  onNavigateToContent?: () => void
  onNavigateToTasks?: () => void
  onNavigateToPrototype?: () => void
}
export function buildSections({
  studyId,
  studyType,
  selectedDemographicSectionId,
  setSelectedDemographicSectionId,
  onNavigateToContent,
  onNavigateToTasks,
  onNavigateToPrototype,
}: BuildSectionsProps): SectionConfig[] {
  // Base sections common to all study types
  const baseSections: SectionConfig[] = [
    {
      id: 'welcome',
      title: 'Welcome Message',
      description: 'Introduce participants to your study',
      component: <WelcomeSection studyId={studyId} />,
    },
    {
      id: 'agreement',
      title: 'Participant Agreement',
      description: 'Consent and agreement for participation',
      enabledKey: 'participantAgreement',
      component: <AgreementSection studyId={studyId} />,
    },
    {
      id: 'screening',
      title: 'Screening Questions',
      description: 'Filter participants based on criteria',
      enabledKey: 'screening',
      component: <ScreeningSection />,
      hasQuestions: true,
    },
    {
      id: 'identifier',
      title: 'Participant Identifier',
      description: 'How to identify participants',
      component: (
        <IdentifierSection
          selectedSectionId={selectedDemographicSectionId}
        />
      ),
    },
  ]

  // Activity sections vary by study type
  let activitySections: SectionConfig[] = []

  if (studyType === 'survey') {
    activitySections = [
      {
        id: 'survey',
        title: 'Survey Questionnaire',
        description: 'The main survey questions',
        component: <SurveyQuestionnaireSection studyId={studyId} />,
        hasQuestions: true,
        isSurveyActivity: true,
      },
    ]
  } else {
    // Activity title and description based on study type
    const activityConfig = {
      card_sort: {
        title: 'Card sort',
        description: 'Configure cards and categories',
      },
      tree_test: {
        title: 'Tree test',
        description: 'Configure tree structure',
      },
      prototype_test: {
        title: 'Prototype test',
        description: 'Configure Figma prototype and tasks',
      },
      first_click: {
        title: 'First-click test',
        description: 'Configure tasks and images',
      },
      first_impression: {
        title: 'First Impression Test',
        description: 'Configure design variants and questions',
      },
      live_website_test: {
        title: 'Live Website Test',
        description: 'Configure tasks and website URLs',
      },
    }

    const config = activityConfig[studyType]

    activitySections = [
      {
        id: 'pre_study',
        title: 'Pre-Study Questions',
        description: 'Questions before the main activity',
        enabledKey: 'preStudyQuestions',
        component: <QuestionsSection section="pre_study" studyId={studyId} />,
        hasQuestions: true,
      },
      {
        id: 'instructions',
        title: config.title,
        description: config.description,
        component: (
          <InstructionsSection
            studyType={studyType}
            studyId={studyId}
            onNavigateToContent={onNavigateToContent}
          />
        ),
        isMainActivity: true,
      },
      // Prototype test settings section (only shown for prototype_test)
      ...(studyType === 'prototype_test'
        ? [
            {
              id: 'prototype_settings' as const,
              title: 'Prototype Test Settings',
              description: 'Configure task and prototype options',
              component: (
                <PrototypeTestSettingsSection
                  onNavigateToTasks={onNavigateToTasks}
                  onNavigateToPrototype={onNavigateToPrototype}
                />
              ),
            },
          ]
        : []),
      {
        id: 'post_study',
        title: 'Post-Study Questions',
        description: 'Questions after the main activity',
        enabledKey: 'postStudyQuestions',
        component: <QuestionsSection section="post_study" studyId={studyId} />,
        hasQuestions: true,
      },
    ]
  }

  // End sections common to all study types
  const endSections: SectionConfig[] = [
    {
      id: 'thank_you',
      title: 'Thank You Message',
      description: 'Message shown after completion',
      component: <ThankYouSection studyId={studyId} />,
    },
    {
      id: 'closed',
      title: 'Closed Study Message',
      description: 'Message when study is no longer active',
      component: <ClosedSection />,
    },
  ]

  return [...baseSections, ...activitySections, ...endSections]
}
