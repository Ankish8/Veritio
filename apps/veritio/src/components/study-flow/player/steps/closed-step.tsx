'use client'

import { useEffect, useCallback } from 'react'
import { Lock } from 'lucide-react'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { useFlowSettings } from '@/stores/study-flow-player'
import { useGlobalKeyboardShortcuts } from '../use-global-keyboard-shortcuts'
import { StepLayout, BrandedButton } from '../step-layout'

export function ClosedStep() {
  const flowSettings = useFlowSettings()
  const { title, message, redirectUrl, redirectImmediately } = flowSettings.closedStudy

  useEffect(() => {
    if (redirectImmediately && redirectUrl) {
      window.location.href = redirectUrl
    }
  }, [redirectImmediately, redirectUrl])

  const handleRedirect = useCallback(() => {
    if (redirectUrl) {
      window.location.href = redirectUrl
    }
  }, [redirectUrl])

  // Keyboard shortcut: Enter to continue (only when button is visible)
  useGlobalKeyboardShortcuts({
    onEnter: handleRedirect,
    enabled: !!redirectUrl, // Only enable when Continue button is shown
  })

  return (
    <StepLayout
      centered
      actions={
        redirectUrl ? (
          <div className="flex justify-center">
            <BrandedButton onClick={handleRedirect}>
              Continue
              <KeyboardShortcutHint shortcut="enter" variant="dark" />
            </BrandedButton>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col items-center">
        <div className="mb-6">
          <Lock className="h-16 w-16 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--style-text-primary)' }}>{title}</h1>
        <p className="text-lg text-muted-foreground text-center max-w-md">
          {message}
        </p>
      </div>
    </StepLayout>
  )
}
