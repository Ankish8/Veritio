'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ButtonBounce } from '../css-animations'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { useFlowSettings, usePlayerActions } from '@/stores/study-flow-player'
import { StepLayout, BrandedButton } from '../step-layout'
import { RichContent } from '../rich-content'

interface AgreementStepProps {
  onReject: () => void
}

export function AgreementStep({ onReject }: AgreementStepProps) {
  const t = useTranslations()
  const flowSettings = useFlowSettings()
  const { setAgreedToTerms, nextStep, previousStep } = usePlayerActions()
  const { title, message, agreementText, rejectionTitle, rejectionMessage, redirectUrl } =
    flowSettings.participantAgreement

  const [agreed, setAgreed] = useState(false)
  const [showRejection, setShowRejection] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false) // Tracks the full animation sequence
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  // Trigger the Typeform-style transition animation
  // Flow: checkbox checked → button enables → brief pause → button bounces → transition
  const triggerTransition = useCallback(() => {
    if (isAnimating) return

    // Lock to prevent double-triggers (but don't affect visual state yet)
    setIsAnimating(true)

    // Step 1: Check the checkbox (button becomes ENABLED and visible)
    setAgreed(true)

    // Step 2: After brief delay to show enabled state, start button animation
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(true)

      // Step 3: After animation completes, proceed to next step
      animationTimeoutRef.current = setTimeout(() => {
        setAgreedToTerms(true)
        nextStep()
      }, 300) // Wait for subtle press animation
    }, 200) // Pause to let user see button is now enabled
  }, [isAnimating, setAgreedToTerms, nextStep])

  // Keyboard handlers: Space = check + auto-continue, Enter = continue (if agreed), Escape = back
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle if showing rejection screen or animating
    if (showRejection || isAnimating) return

    // Space checks the checkbox AND triggers transition to next page
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      // Only trigger transition if not already agreed
      if (!agreed) {
        triggerTransition()
      } else {
        // If already agreed, just uncheck (toggle behavior)
        setAgreed(false)
      }
      return
    }

    // Enter continues if agreed
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      if (agreed) {
        e.preventDefault()
        triggerTransition()
      }
      return
    }

    // Escape goes back
    if (e.key === 'Escape') {
      e.preventDefault()
      previousStep()
    }
  }, [showRejection, isAnimating, agreed, triggerTransition, previousStep])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleAgree = () => {
    // Prevent double-clicks during animation
    if (isAnimating) return
    // Use the same transition animation when clicking the button
    triggerTransition()
  }

  const handleDecline = () => {
    setShowRejection(true)
  }

  const handleRedirect = () => {
    if (redirectUrl) {
      window.location.href = redirectUrl
    } else {
      onReject()
    }
  }

  // Rejection state - centered layout
  if (showRejection) {
    return (
      <StepLayout
        title={rejectionTitle}
        centered
        actions={
          redirectUrl ? (
            <div className="flex justify-center">
              <BrandedButton onClick={handleRedirect}>{t('common.continue')}</BrandedButton>
            </div>
          ) : undefined
        }
      >
        <p className="text-lg text-muted-foreground">{rejectionMessage}</p>
      </StepLayout>
    )
  }

  // Main agreement view
  return (
    <StepLayout
      title={title}
      subtitle={t('agreement.subtitle')}
      showBackButton
      onBack={previousStep}
      actions={
        <div className="flex justify-between">
          <Button variant="outline" size="lg" onClick={handleDecline} disabled={isAnimating}>
            {t('agreement.disagreeButton')}
          </Button>
          {/* Animated button wrapper for Typeform-style feedback */}
          <ButtonBounce isActive={isTransitioning}>
            {/* disabled only checks `agreed` so button visually enables before animation */}
            {/* isAnimating prevents the onClick handler from triggering */}
            <BrandedButton onClick={handleAgree} disabled={!agreed}>
              {t('agreement.agreeButton')}
              <KeyboardShortcutHint shortcut="enter" variant="dark" />
            </BrandedButton>
          </ButtonBounce>
        </div>
      }
    >
      {/* Introduction message */}
      {message && (
        <RichContent html={message} className="mb-6" />
      )}

      {/* Agreement box */}
      <div
        className="rounded-lg p-5"
        style={{
          backgroundColor: 'var(--style-bg-muted)',
          border: '1px solid var(--style-border-muted)',
          borderRadius: 'var(--style-radius)',
        }}
      >
        <RichContent html={agreementText} />

        {/* Checkbox - NOT pre-selected */}
        <div
          className="flex items-start gap-3 mt-5 pt-4"
          style={{ borderTop: '1px solid var(--style-border-muted)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="hidden sm:inline-flex items-center justify-center w-12 h-5 rounded text-xs font-medium"
              style={{ backgroundColor: 'var(--style-border-muted)', color: 'var(--style-text-secondary)' }}
            >
              Space
            </span>
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => {
                if (isAnimating) return
                const isChecking = checked === true
                if (isChecking) {
                  triggerTransition()
                } else {
                  setAgreed(false)
                }
              }}
              className="mt-0.5"
              branded
            />
          </div>
          <Label htmlFor="agree" className="text-sm cursor-pointer leading-normal" style={{ color: 'var(--style-text-primary)' }}>
            {t('agreement.checkboxLabel')}
          </Label>
        </div>
      </div>
    </StepLayout>
  )
}
