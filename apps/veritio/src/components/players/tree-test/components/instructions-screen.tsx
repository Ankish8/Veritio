'use client'

import { StepLayout, BrandedButton } from '@/components/study-flow/player/step-layout'
import type { InstructionsScreenProps } from '../types'

export function InstructionsScreen({ onContinue }: InstructionsScreenProps) {
  return (
    <StepLayout
      title="Instructions"
      actions={
        <div className="flex justify-end">
          <BrandedButton onClick={onContinue}>
            Continue
          </BrandedButton>
        </div>
      }
    >
      <div className="space-y-6">
        <p className="font-medium" style={{ color: 'var(--style-text-primary)' }}>
          Here&apos;s how it works:
        </p>

        <ol className="space-y-4" style={{ color: 'var(--style-text-secondary)' }}>
          <li className="flex gap-3">
            <span className="font-semibold shrink-0" style={{ color: 'var(--style-text-primary)' }}>1.</span>
            <span>
              You will be asked to find a certain item and presented with a list of links.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold shrink-0" style={{ color: 'var(--style-text-primary)' }}>2.</span>
            <span>
              Click through the list until you arrive at one that you think helps you complete
              the task.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold shrink-0" style={{ color: 'var(--style-text-primary)' }}>3.</span>
            <span>
              If you take a wrong turn, you can go back by clicking one of the links above.
            </span>
          </li>
        </ol>

        <p className="italic text-sm" style={{ color: 'var(--style-text-muted)' }}>
          This is not a test of your ability, there are no right or wrong answers.
        </p>

        <p style={{ color: 'var(--style-text-primary)' }}>That&apos;s it, let&apos;s get started!</p>
      </div>
    </StepLayout>
  )
}
