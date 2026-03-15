'use client'

import { BrandedButton } from '@/components/study-flow/player/step-layout'

interface WelcomeScreenProps {
  welcomeMessage: string
  onStart: () => void
}

export function WelcomeScreen({ welcomeMessage, onStart }: WelcomeScreenProps) {
  return (
    <div
      className="flex-1 flex flex-col min-h-0"
      style={{ backgroundColor: 'var(--style-page-bg)' }}
    >
      <div className="flex-1 flex items-center justify-center">
        <div className="mx-auto px-6 py-8 max-w-md w-full">
          <div
            className="p-8 text-center"
            style={{
              backgroundColor: 'var(--style-card-bg)',
              borderRadius: 'var(--style-radius-lg)',
              border: '1px solid var(--style-card-border)',
              boxShadow: 'var(--style-shadow)',
            }}
          >
            <h1
              className="text-2xl font-bold mb-4"
              style={{ color: 'var(--style-text-primary)' }}
            >
              Welcome
            </h1>
            <p
              className="mb-8 whitespace-pre-wrap"
              style={{ color: 'var(--style-text-secondary)' }}
            >
              {welcomeMessage || 'Welcome to this card sorting study. You will be asked to organize cards into groups that make sense to you.'}
            </p>
            <BrandedButton size="lg" onClick={onStart} className="w-full">
              Start Sorting
            </BrandedButton>
          </div>
        </div>
      </div>
    </div>
  )
}
