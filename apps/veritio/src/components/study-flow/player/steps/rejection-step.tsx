'use client'

import { useEffect, useCallback } from 'react'
import { XCircle } from 'lucide-react'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { useFlowSettings } from '@/stores/study-flow-player'
import { useGlobalKeyboardShortcuts } from '../use-global-keyboard-shortcuts'
import { StepLayout, BrandedButton } from '../step-layout'

export function RejectionStep() {
  const flowSettings = useFlowSettings()
  const { rejectionTitle, rejectionMessage, redirectUrl, redirectImmediately } =
    flowSettings.screening

  useEffect(() => {
    if (redirectImmediately && redirectUrl) {
      window.location.href = redirectUrl
    }
  }, [redirectImmediately, redirectUrl])

  const handleContinue = useCallback(() => {
    if (redirectUrl) {
      window.location.href = redirectUrl
    } else {
      // Close the window or redirect to home
      window.close()
      // If window.close() doesn't work (most browsers block it), redirect
      setTimeout(() => {
        window.location.href = '/'
      }, 100)
    }
  }, [redirectUrl])

  // Keyboard shortcut: Enter to continue
  useGlobalKeyboardShortcuts({ onEnter: handleContinue })

  // Check if message contains HTML tags
  const isHtml = rejectionMessage.includes('<')

  return (
    <StepLayout
      centered
      actions={
        <div className="flex justify-center">
          <BrandedButton onClick={handleContinue}>
            {redirectUrl ? 'Continue' : 'Close'}
            <KeyboardShortcutHint shortcut="enter" variant="dark" />
          </BrandedButton>
        </div>
      }
    >
      <div className="flex flex-col items-center">
        <div className="mb-6">
          <XCircle className="h-16 w-16 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--style-text-primary)' }}>{rejectionTitle}</h1>
        {isHtml ? (
          <div
            className="prose prose-lg max-w-md text-center text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: rejectionMessage }}
          />
        ) : (
          <p className="text-lg text-muted-foreground text-center max-w-md">
            {rejectionMessage}
          </p>
        )}
      </div>
    </StepLayout>
  )
}
