'use client'

import { useEffect, useCallback, useState } from 'react'
import { CheckCircle, Gift } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFlowSettings } from '@/stores/study-flow-player'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { useGlobalKeyboardShortcuts } from '../use-global-keyboard-shortcuts'
import { useRedirectCountdown } from '../use-redirect-countdown'
import { StepLayout, BrandedButton } from '../step-layout'
import { RichContent } from '../rich-content'
import { useIncentiveConfig } from '../incentive-context'
import { replaceIncentivePlaceholder, shouldShowIncentive } from '@/lib/utils/format-incentive'

interface ThankYouStepProps {
  onComplete: () => void
}

export function ThankYouStep({ onComplete }: ThankYouStepProps) {
  const t = useTranslations()
  const flowSettings = useFlowSettings()
  const incentiveConfig = useIncentiveConfig()
  const { title, message, redirectUrl, redirectDelay, showIncentive, incentiveMessage } = flowSettings.thankYou

  // Show incentive confirmation if:
  // 1. Toggle is enabled in flow settings (builder)
  // 2. Participant came from widget (incentives are widget-exclusive)
  // 3. Incentive is actually configured with valid amount
  const displayIncentive = showIncentive && shouldShowIncentive(incentiveConfig)
  // Use default message if not set (for studies created before this feature)
  const rawIncentiveMessage = incentiveMessage || 'Your {incentive} will be sent to you soon'
  const formattedIncentiveMessage = displayIncentive
    ? replaceIncentivePlaceholder(rawIncentiveMessage, incentiveConfig)
    : null

  const [completionFired, setCompletionFired] = useState(false)
  const { countdown, handleRedirect } = useRedirectCountdown({ redirectUrl, redirectDelay })

  // Fire completion when thank you step is reached
  // Small delay to ensure session is ready
  useEffect(() => {
    if (!completionFired) {
      const timer = setTimeout(() => {
        setCompletionFired(true)
        onComplete()
      }, 100) // Small delay to let session state settle
      return () => clearTimeout(timer)
    }
  }, [completionFired, onComplete])

  const handleContinue = useCallback(() => {
    if (redirectUrl) {
      handleRedirect()
    } else {
      onComplete()
    }
  }, [redirectUrl, handleRedirect, onComplete])

  // Keyboard shortcut: Enter to continue (only when button is visible)
  useGlobalKeyboardShortcuts({
    onEnter: handleContinue,
    enabled: !!redirectUrl, // Only enable when Continue button is shown
  })

  return (
    <StepLayout
      centered
      actions={
        redirectUrl ? (
          <div className="flex justify-center">
            <BrandedButton onClick={handleContinue}>
              {countdown > 0 ? t('thankYou.continueNow') : t('common.continue')}
              <KeyboardShortcutHint shortcut="enter" variant="dark" />
            </BrandedButton>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col items-center">
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--style-text-primary)' }}>{title}</h1>
        <RichContent html={message} className="text-center" />

        {/* Incentive Confirmation */}
        {displayIncentive && formattedIncentiveMessage && (
          <div
            className="mt-6 rounded-lg px-4 py-3 flex items-center justify-center gap-3"
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(22, 163, 74, 0.2)',
            }}
          >
            <Gift
              className="h-5 w-5 flex-shrink-0"
              style={{ color: 'rgb(22, 163, 74)' }}
            />
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--style-text-primary)' }}
            >
              {formattedIncentiveMessage}
            </p>
          </div>
        )}

        {redirectUrl && redirectDelay && redirectDelay > 0 && countdown > 0 && (
          <p className="text-sm text-muted-foreground mt-6">
            {t('thankYou.redirecting', { seconds: countdown })}
          </p>
        )}
      </div>
    </StepLayout>
  )
}
