'use client'

import React from 'react'
import { Lock } from 'lucide-react'
import { StudyFlowPlayer } from '@/components/study-flow/player'
import { ParticipantStudySkeleton } from '@/components/dashboard/skeletons'
import {
  PreviewBanner,
  StudyErrorState,
  DuplicateBlockedState,
  PasswordRequiredState,
} from '@/components/study-flow/player/states'
import type { PasswordRequiredResponse } from '@/hooks/use-participant-study'
import type { ParticipantStudyData } from '@/hooks/use-participant-study'
import { StudyTranslationsProvider } from '@/i18n'
import type { SupportedLocale } from '@/i18n/config'
import {
  migrateToStudyFlowSettings,
  cardSortInstructions,
  treeTestInstructions,
  prototypeTestInstructions,
  firstClickInstructions,
  firstImpressionInstructions,
  liveWebsiteTestInstructions,
  defaultActivityInstructionsSettings,
  OLD_CARD_SORT_DEFAULTS,
} from '@/lib/study-flow/defaults'
import type { StudyFlowSettings } from '@veritio/study-types/study-flow-types'
import type { BrandingSettings } from '@/components/builders/shared/types'
import { Card as UICard, CardContent } from '@/components/ui/card'
import { IncentiveProvider } from '@/components/study-flow/player/incentive-context'
import type { IncentiveDisplayConfig } from '@/lib/utils/format-incentive'
import { useStudyPlayer } from './use-study-player'
import {
  FigmaPreloader,
  CardSortActivity,
  TreeTestActivity,
  PrototypeTestActivity,
  FirstClickActivity,
  FirstImpressionActivity,
  LiveWebsiteActivity,
  LiveWebsiteMobileBlocker,
  getHasPracticeRound,
  shouldBlockMobile,
  getEffectiveVariantId,
} from './study-type-renderers'

export interface StudyPlayerClientProps {
  studyCode: string
  initialStudy: ParticipantStudyData | null
  initialPasswordRequired: PasswordRequiredResponse | null
  initialError: string | null
  isPreviewMode: boolean
  /** Study language locale for translations */
  locale: SupportedLocale
  /** Translation messages for the locale */
  messages: Record<string, unknown>
  /** Incentive configuration for display to participants */
  incentiveConfig?: IncentiveDisplayConfig | null
}

export function StudyPlayerClient({
  studyCode,
  initialStudy,
  initialPasswordRequired,
  initialError,
  isPreviewMode,
  locale,
  messages,
  incentiveConfig,
}: StudyPlayerClientProps) {
  const {
    hasMounted,
    study,
    passwordRequired,
    error,
    isLoading,
    isPasswordError,
    isBlocked,
    blockMessage,
    preventionData,
    currentStep,
    participantId,
    sessionToken,
    assignedVariantId,
    restoredProgress,
    isRestorationComplete,
    submittedPassword,
    isWidgetParticipant,
    participantDemographicData,
    handleFlowComplete,
    handleScreeningReject,
    handleActivityComplete,
    handlePasswordSubmit,
  } = useStudyPlayer({
    studyCode,
    initialStudy,
    initialPasswordRequired,
    initialError,
    isPreviewMode,
  })

  // Error state - check BEFORE loading to ensure errors are shown immediately
  if (error && !isPasswordError) {
    return <StudyErrorState message={error} />
  }

  // Show skeleton until client has mounted — store data only valid after initialize() runs
  if (!hasMounted) {
    return <ParticipantStudySkeleton />
  }

  // Loading states (only show if no error)
  if (isLoading || (restoredProgress && !isRestorationComplete)) {
    return <ParticipantStudySkeleton />
  }

  // Blocked by duplicate prevention
  if (isBlocked) {
    return <DuplicateBlockedState message={blockMessage ?? undefined} />
  }

  // Password entry screen
  if (passwordRequired) {
    return (
      <StudyTranslationsProvider locale={locale} messages={messages}>
        <PasswordRequiredState
          title={passwordRequired.title}
          branding={passwordRequired.branding}
          onSubmit={handlePasswordSubmit}
          isSubmitting={isLoading && submittedPassword !== undefined}
          error={isPasswordError ? 'password.incorrect' : null}
        />
      </StudyTranslationsProvider>
    )
  }

  if (!study) {
    return <StudyErrorState />
  }

  // Get settings and flow settings
  const rawSettings = study.settings && typeof study.settings === 'object' && !Array.isArray(study.settings)
    ? study.settings as Record<string, unknown>
    : {}

  const flowSettings = migrateToStudyFlowSettings(
    study.welcome_message,
    study.thank_you_message,
    rawSettings.studyFlow as Partial<StudyFlowSettings> | undefined,
    study.study_type as 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  )

  // Force instructions for activity-based study types (not survey)
  if (study.study_type !== 'survey') {
    flowSettings.activityInstructions.enabled = true
  }

  // Runtime correction: fix stale/wrong instructions saved from creation bugs.
  if (study.study_type === 'card_sort') {
    const STALE_DEFAULTS = [
      liveWebsiteTestInstructions.part1,
      treeTestInstructions.part1,
      prototypeTestInstructions.part1,
      firstClickInstructions.part1,
      firstImpressionInstructions.part1,
      defaultActivityInstructionsSettings.part1,
      ...OLD_CARD_SORT_DEFAULTS,
    ]
    const currentPart1 = flowSettings.activityInstructions.part1?.trim()
    if (currentPart1 && STALE_DEFAULTS.some((d) => d?.trim() === currentPart1)) {
      const mode = (rawSettings.mode as string) || 'open'
      const modeKey = (['open', 'closed', 'hybrid'].includes(mode) ? mode : 'open') as keyof typeof cardSortInstructions
      flowSettings.activityInstructions.part1 = cardSortInstructions[modeKey].part1
      flowSettings.activityInstructions.part2 = cardSortInstructions[modeKey].part2
    }
  }

  // Force post-study questions enabled when questions exist
  if ((study.post_study_questions?.length ?? 0) > 0) {
    flowSettings.postStudyQuestions.enabled = true
  }

  const studyMeta = {
    title: study.title,
    description: study.description || null,
    purpose: study.purpose || null,
    participantRequirements: study.participant_requirements || null,
  }

  const commonFlowProps = {
    studyId: study.id,
    participantId: (participantId || '') as string,
    settings: flowSettings,
    screeningQuestions: study.screening_questions || [],
    branding: study.branding as BrandingSettings | undefined,
    studyMeta,
    onFlowComplete: handleFlowComplete,
    onScreeningReject: handleScreeningReject,
    studyCode,
    sessionToken: sessionToken || undefined,
    isPreviewMode,
  }

  const activityProps = {
    study,
    studyCode,
    rawSettings,
    flowSettings,
    currentStep,
    participantId,
    sessionToken,
    isPreviewMode,
    preventionData,
    assignedVariantId,
    participantDemographicData: participantDemographicData as Record<string, string> | null | undefined,
    onActivityComplete: handleActivityComplete,
  }

  // Card Sort Player
  if (study.study_type === 'card_sort') {
    return (
      <IncentiveProvider config={incentiveConfig ?? null} isWidgetParticipant={isWidgetParticipant}>
        <StudyTranslationsProvider locale={locale} messages={messages}>
          {isPreviewMode && <PreviewBanner />}
          <StudyFlowPlayer
            {...commonFlowProps}
            studyType="card_sort"
            preStudyQuestions={study.pre_study_questions || []}
            postStudyQuestions={study.post_study_questions || []}
          >
            <CardSortActivity {...activityProps} />
          </StudyFlowPlayer>
        </StudyTranslationsProvider>
      </IncentiveProvider>
    )
  }

  // Tree Test Player
  if (study.study_type === 'tree_test') {
    return (
      <IncentiveProvider config={incentiveConfig ?? null} isWidgetParticipant={isWidgetParticipant}>
        <StudyTranslationsProvider locale={locale} messages={messages}>
          {isPreviewMode && <PreviewBanner />}
          <StudyFlowPlayer
            {...commonFlowProps}
            studyType="tree_test"
            preStudyQuestions={study.pre_study_questions || []}
            postStudyQuestions={study.post_study_questions || []}
          >
            <TreeTestActivity {...activityProps} />
          </StudyFlowPlayer>
        </StudyTranslationsProvider>
      </IncentiveProvider>
    )
  }

  // Survey Player
  if (study.study_type === 'survey') {
    return (
      <IncentiveProvider config={incentiveConfig ?? null} isWidgetParticipant={isWidgetParticipant}>
        <StudyTranslationsProvider locale={locale} messages={messages}>
          {isPreviewMode && <PreviewBanner />}
          <StudyFlowPlayer
            {...commonFlowProps}
            studyType="survey"
            preStudyQuestions={[]}
            postStudyQuestions={[]}
            surveyQuestions={study.survey_questions || []}
            initialRules={study.survey_rules}
          />
        </StudyTranslationsProvider>
      </IncentiveProvider>
    )
  }

  // Prototype Test Player
  if (study.study_type === 'prototype_test') {
    const shouldPreloadFigma = currentStep !== 'activity' &&
      currentStep !== 'thank_you' &&
      currentStep !== 'rejected' &&
      currentStep !== 'closed' &&
      study.prototype_test_prototype

    return (
      <IncentiveProvider config={incentiveConfig ?? null} isWidgetParticipant={isWidgetParticipant}>
        <StudyTranslationsProvider locale={locale} messages={messages}>
          {isPreviewMode && <PreviewBanner />}
          {shouldPreloadFigma && (
            <FigmaPreloader
              prototype={study.prototype_test_prototype}
              frames={study.prototype_test_frames || []}
              tasks={study.prototype_test_tasks || []}
            />
          )}
          <StudyFlowPlayer
            {...commonFlowProps}
            studyType="prototype_test"
            preStudyQuestions={study.pre_study_questions || []}
            postStudyQuestions={study.post_study_questions || []}
          >
            <PrototypeTestActivity {...activityProps} />
          </StudyFlowPlayer>
        </StudyTranslationsProvider>
      </IncentiveProvider>
    )
  }

  // First-Click Test Player
  if (study.study_type === 'first_click') {
    return (
      <IncentiveProvider config={incentiveConfig ?? null} isWidgetParticipant={isWidgetParticipant}>
        <StudyTranslationsProvider locale={locale} messages={messages}>
          {isPreviewMode && <PreviewBanner />}
          <StudyFlowPlayer
            {...commonFlowProps}
            studyType="first_click"
            preStudyQuestions={study.pre_study_questions || []}
            postStudyQuestions={study.post_study_questions || []}
          >
            <FirstClickActivity {...activityProps} />
          </StudyFlowPlayer>
        </StudyTranslationsProvider>
      </IncentiveProvider>
    )
  }

  // First Impression Test Player
  if (study.study_type === 'first_impression') {
    const hasPracticeRound = getHasPracticeRound(study)

    return (
      <IncentiveProvider config={incentiveConfig ?? null} isWidgetParticipant={isWidgetParticipant}>
        <StudyTranslationsProvider locale={locale} messages={messages}>
          {isPreviewMode && <PreviewBanner />}
          <StudyFlowPlayer
            {...commonFlowProps}
            studyType="first_impression"
            preStudyQuestions={study.pre_study_questions || []}
            postStudyQuestions={study.post_study_questions || []}
            hasPracticeRound={hasPracticeRound}
          >
            <FirstImpressionActivity {...activityProps} />
          </StudyFlowPlayer>
        </StudyTranslationsProvider>
      </IncentiveProvider>
    )
  }

  // Live Website Test Player
  if (study.study_type === 'live_website_test') {
    // Block mobile/tablet devices when allowMobile is disabled
    if (shouldBlockMobile(rawSettings)) {
      return <LiveWebsiteMobileBlocker />
    }

    const effectiveVariantId = getEffectiveVariantId(assignedVariantId, isPreviewMode, rawSettings, study)

    return (
      <IncentiveProvider config={incentiveConfig ?? null} isWidgetParticipant={isWidgetParticipant}>
        <StudyTranslationsProvider locale={locale} messages={messages}>
          {isPreviewMode && <PreviewBanner />}
          <StudyFlowPlayer
            {...commonFlowProps}
            studyType="live_website_test"
            preStudyQuestions={[]}
            postStudyQuestions={study.post_study_questions || []}
          >
            <LiveWebsiteActivity {...activityProps} effectiveVariantId={effectiveVariantId} />
          </StudyFlowPlayer>
        </StudyTranslationsProvider>
      </IncentiveProvider>
    )
  }

  // Unknown study type fallback
  return (
    <StudyTranslationsProvider locale={locale} messages={messages}>
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <UICard className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">{study.title}</h1>
            <p className="text-muted-foreground">This study type is not supported.</p>
          </CardContent>
        </UICard>
      </div>
    </StudyTranslationsProvider>
  )
}
