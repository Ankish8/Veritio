'use client'

import { ButtonBounce } from '../css-animations'
import { FlaskConical } from 'lucide-react'
import { useFlowSettings, usePlayerActions } from '@/stores/study-flow-player'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { useGlobalKeyboardShortcuts } from '../use-global-keyboard-shortcuts'
import { useStepTransition } from '../use-step-transition'
import { StepLayout, BrandedButton } from '../step-layout'
import { RichContent } from '../rich-content'

interface InstructionsStepProps {
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  hasPracticeRound?: boolean
}

export function InstructionsStep({ studyType, hasPracticeRound = false }: InstructionsStepProps) {
  const flowSettings = useFlowSettings()
  const { nextStep, previousStep } = usePlayerActions()
  const { title, part1, part2 } = flowSettings.activityInstructions

  // Show practice notice for first impression studies with practice round
  const showPracticeNotice = studyType === 'first_impression' && hasPracticeRound

  const { isTransitioning, isAnimating, triggerTransition } = useStepTransition({
    onTransitionEnd: nextStep,
  })

  const handleStart = () => {
    if (!isAnimating) triggerTransition()
  }

  useGlobalKeyboardShortcuts({
    onEnter: handleStart,
    onEscape: previousStep,
  })

  const activityNames: Record<string, string> = {
    card_sort: 'Card Sorting',
    tree_test: 'Tree Testing',
    prototype_test: 'Prototype Testing',
    first_click: 'First Click Test',
    first_impression: 'First Impression Test',
    live_website_test: 'Live Website Test',
    survey: 'Survey',
  }
  const activityName = activityNames[studyType] || 'Survey'

  // Button text changes if starting with a practice round
  const buttonText = showPracticeNotice ? 'Start Practice Round' : `Start ${activityName}`

  return (
    <StepLayout
      title={title || `${activityName} Instructions`}
      showBackButton
      onBack={previousStep}
      actions={
        <div className="flex justify-end">
          <ButtonBounce isActive={isTransitioning}>
            <BrandedButton onClick={handleStart}>
              {buttonText}
              <KeyboardShortcutHint shortcut="enter" variant="dark" />
            </BrandedButton>
          </ButtonBounce>
        </div>
      }
    >
      <div className="space-y-6">
        <RichContent html={part1} />

        {/* Card sort interaction hint — device-specific */}
        {studyType === 'card_sort' && (
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand, #3b82f6) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--brand, #3b82f6) 20%, transparent)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--style-text-secondary)' }}>
              <span className="hidden md:inline">
                <strong style={{ color: 'var(--style-text-primary)' }}>Tip:</strong> Drag and drop cards into categories to sort them.
              </span>
              <span className="md:hidden inline">
                <strong style={{ color: 'var(--style-text-primary)' }}>Tip:</strong> Tap a card to select it, then choose a category to sort it into.
              </span>
            </p>
          </div>
        )}

        {part2 && (
          <div className="pt-6" style={{ borderTop: '1px solid var(--style-border-muted)' }}>
            <RichContent html={part2} />
          </div>
        )}

        {/* Practice round notice for first impression studies */}
        {showPracticeNotice && (
          <div
            className="rounded-lg p-4 mt-6"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand, #3b82f6) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--brand, #3b82f6) 30%, transparent)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--brand, #3b82f6)' }}
              >
                <FlaskConical className="w-4 h-4 text-white" />
              </div>
              <div>
                <p
                  className="font-medium mb-1"
                  style={{ color: 'var(--style-text-primary)' }}
                >
                  Practice First
                </p>
                <p
                  className="text-sm"
                  style={{ color: 'var(--style-text-secondary)' }}
                >
                  The first design is a practice round to help you get comfortable with the task.
                  Your practice responses won't be included in the final results.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </StepLayout>
  )
}
