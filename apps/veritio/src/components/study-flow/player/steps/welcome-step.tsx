'use client'

import { FadeIn, ButtonBounce } from '../css-animations'
import { useTranslations } from 'next-intl'
import { Gift } from 'lucide-react'
import { useFlowSettings, useStudyMeta, usePlayerActions } from '@/stores/study-flow-player'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { useGlobalKeyboardShortcuts } from '../use-global-keyboard-shortcuts'
import { useStepTransition } from '../use-step-transition'
import { StepLayout, BrandedButton } from '../step-layout'
import { RichContent } from '../rich-content'
import { useIncentiveConfig } from '../incentive-context'
import { replaceIncentivePlaceholder, shouldShowIncentive } from '@/lib/utils/format-incentive'
import DOMPurify from 'dompurify'

export function WelcomeStep() {
  const t = useTranslations()
  const flowSettings = useFlowSettings()
  const { nextStep } = usePlayerActions()
  const incentiveConfig = useIncentiveConfig()

  const { isTransitioning, isAnimating, triggerTransition } = useStepTransition({
    onTransitionEnd: nextStep,
  })

  const handleStart = () => {
    if (!isAnimating) triggerTransition()
  }

  useGlobalKeyboardShortcuts({
    onEnter: handleStart,
  })
  const studyMeta = useStudyMeta()
  const {
    title,
    message,
    includeStudyTitle,
    includeDescription,
    includePurpose,
    includeParticipantRequirements,
  } = flowSettings.welcome
  // Check which info blocks should be shown (toggle enabled AND value exists)
  const showStudyTitle = includeStudyTitle && studyMeta?.title
  const showDescription = includeDescription && studyMeta?.description
  const showPurpose = includePurpose && studyMeta?.purpose
  const showRequirements = includeParticipantRequirements && studyMeta?.participantRequirements

  const hasStudyInfo = showStudyTitle || showDescription
  const hasDetailedInfo = showPurpose || showRequirements

  // Show incentive card if:
  // 1. Toggle is enabled in flow settings (builder)
  // 2. Participant came from widget (incentives are widget-exclusive)
  // 3. Incentive is actually configured with valid amount
  const displayIncentive = flowSettings.welcome.showIncentive && shouldShowIncentive(incentiveConfig)
  // Use default message if not set (for studies created before this feature)
  const rawIncentiveMessage = flowSettings.welcome.incentiveMessage || 'Complete this study and receive {incentive}'
  const incentiveMessage = displayIncentive
    ? replaceIncentivePlaceholder(rawIncentiveMessage, incentiveConfig)
    : null

  return (
    <StepLayout
      title={title}
      actions={
        <FadeIn className="flex justify-end" delay={0.4}>
          <ButtonBounce isActive={isTransitioning}>
            <BrandedButton onClick={handleStart}>
              {t('common.getStarted')}
              <KeyboardShortcutHint shortcut="enter" variant="dark" />
            </BrandedButton>
          </ButtonBounce>
        </FadeIn>
      }
    >
      {/* Study Title & Description - prominent, no box */}
      {hasStudyInfo && (
        <FadeIn className="mb-8">
          {showStudyTitle && (
            <h2
              className="text-2xl font-semibold mb-3 tracking-tight leading-tight"
              style={{ color: 'var(--style-text-primary)' }}
            >
              {studyMeta.title}
            </h2>
          )}
          {showDescription && (
            <p className="text-base leading-relaxed" style={{ color: 'var(--style-text-secondary)' }}>
              {studyMeta.description}
            </p>
          )}
        </FadeIn>
      )}

      {/* Purpose & Requirements - subtle info cards */}
      {hasDetailedInfo && (
        <div className="space-y-4 mb-8">
          {showPurpose && (
            <FadeIn
              className="group rounded-xl px-5 py-4 transition-all duration-300"
              style={{
                backgroundColor: 'var(--style-bg-muted)',
                border: '1px solid var(--style-border-muted)',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
              }}
              delay={0.1}
              hoverLift
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-2.5 opacity-70"
                style={{ color: 'var(--style-text-muted)' }}
              >
                {t('welcome.purpose')}
              </p>
              <div
                className="text-sm max-w-none leading-relaxed
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:ml-0
                  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:ml-0
                  [&_li]:my-1 [&_li]:pl-0.5
                  [&_p]:leading-relaxed [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                style={{ color: 'var(--style-text-secondary)' }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(studyMeta.purpose!) }}
              />
            </FadeIn>
          )}
          {showRequirements && (
            <FadeIn
              className="group rounded-xl px-5 py-4 transition-all duration-300"
              style={{
                backgroundColor: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(217,119,6,0.2)',
                boxShadow: '0 1px 3px 0 rgba(251,191,36,0.05)',
              }}
              delay={0.2}
              hoverLift
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-amber-600 dark:text-amber-400 opacity-90"
              >
                {t('welcome.whoShouldParticipate')}
              </p>
              <div
                className="text-sm max-w-none leading-relaxed
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:ml-0
                  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:ml-0
                  [&_li]:my-1 [&_li]:pl-0.5
                  [&_p]:leading-relaxed [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                style={{ color: 'var(--style-text-secondary)' }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(studyMeta.participantRequirements!) }}
              />
            </FadeIn>
          )}
        </div>
      )}

      {/* Incentive Card - shown when enabled in flow settings and incentive is configured */}
      {displayIncentive && incentiveMessage && (
        <FadeIn
          className="rounded-xl px-5 py-4 mb-8 flex items-center gap-3.5 transition-all duration-300"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(22, 163, 74, 0.2)',
            boxShadow: '0 1px 3px 0 rgba(34, 197, 94, 0.05)',
          }}
          delay={0.3}
          hoverLift
        >
          <Gift
            className="h-5 w-5 flex-shrink-0"
            style={{ color: 'rgb(22, 163, 74)' }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--style-text-primary)' }}
          >
            {incentiveMessage}
          </p>
        </FadeIn>
      )}

      {/* Main welcome message */}
      <FadeIn delay={0.35} direction="none">
        <RichContent html={message} />
      </FadeIn>
    </StepLayout>
  )
}
