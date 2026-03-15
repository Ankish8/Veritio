'use client'

import { CheckCircle } from 'lucide-react'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { useGlobalKeyboardShortcuts } from '../use-global-keyboard-shortcuts'
import { useRedirectCountdown } from '../use-redirect-countdown'
import { StepLayout, BrandedButton } from '../step-layout'
import { RichContent } from '../rich-content'

interface EarlySurveyEndStepProps {
  config: {
    title: string
    message: string
    redirectUrl?: string
    redirectDelay?: number
  }
}

export function EarlySurveyEndStep({ config }: EarlySurveyEndStepProps) {
  const { title, message, redirectUrl, redirectDelay = 5 } = config
  const { countdown, handleRedirect } = useRedirectCountdown({ redirectUrl, redirectDelay })

  useGlobalKeyboardShortcuts({
    onEnter: handleRedirect,
    enabled: !!redirectUrl,
  })

  return (
    <StepLayout
      centered
      actions={
        redirectUrl ? (
          <div className="flex justify-center">
            <BrandedButton onClick={handleRedirect}>
              {countdown > 0 ? 'Continue now' : 'Continue'}
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
        {redirectUrl && redirectDelay > 0 && countdown > 0 && (
          <p className="text-sm text-muted-foreground mt-6">
            Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
          </p>
        )}
      </div>
    </StepLayout>
  )
}

export default EarlySurveyEndStep
