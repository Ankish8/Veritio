'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { FadeIn } from '@/components/study-flow/player/css-animations'
import { Play, Clock, FileText, ChevronRight } from 'lucide-react'

export interface WelcomeScreenProps {
  title: string
  message?: string | null
  estimatedDuration?: number | null
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression'
  onStart: () => void
  instructions?: string[]
  showDuration?: boolean
}

const STUDY_TYPE_LABELS: Record<WelcomeScreenProps['studyType'], string> = {
  card_sort: 'Card Sort',
  tree_test: 'Tree Test',
  survey: 'Survey',
  prototype_test: 'Prototype Test',
  first_click: 'First Click Test',
  first_impression: 'First Impression Test',
}

export function WelcomeScreen({
  title,
  message,
  estimatedDuration,
  studyType,
  onStart,
  instructions,
  showDuration = true,
}: WelcomeScreenProps) {
  const t = useTranslations()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleStartClick = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    transitionTimeoutRef.current = setTimeout(() => {
      onStart()
    }, 200)
  }, [isTransitioning, onStart])

  return (
    <div
      className="flex items-center justify-center min-h-screen p-4"
      style={{ backgroundColor: 'var(--style-page-bg)' }}
    >
      <div className="w-full max-w-2xl">
        <FadeIn
          distance={20}
          duration={0.4}
          className="p-8 space-y-6"
          style={{
            backgroundColor: 'var(--style-card-bg)',
            border: '1px solid var(--style-card-border)',
            borderRadius: 'var(--style-radius-lg)',
            boxShadow: 'var(--style-shadow)',
          }}
        >
          {/* Header */}
          <div className="text-center space-y-4">
            {/* Icon */}
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full"
              style={{ backgroundColor: 'var(--brand-light)' }}
            >
              <Play className="h-8 w-8 ml-1" style={{ color: 'var(--brand)' }} />
            </div>

            {/* Study Type Badge */}
            <div className="flex justify-center">
              <span
                className="px-3 py-1 text-xs font-medium rounded-full"
                style={{
                  backgroundColor: 'var(--brand-subtle)',
                  color: 'var(--brand)',
                }}
              >
                {STUDY_TYPE_LABELS[studyType]}
              </span>
            </div>

            {/* Title */}
            <h1
              className="text-2xl font-semibold"
              style={{ color: 'var(--style-text-primary)' }}
            >
              {title}
            </h1>

            {/* Welcome Message */}
            {message && (
              <p
                className="text-base leading-relaxed"
                style={{ color: 'var(--style-text-secondary)' }}
              >
                {message}
              </p>
            )}
          </div>

          {/* Meta Info */}
          {showDuration && estimatedDuration && (
            <div className="flex justify-center">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  backgroundColor: 'var(--style-bg-muted)',
                  border: '1px solid var(--style-border-muted)',
                }}
              >
                <Clock className="h-4 w-4" style={{ color: 'var(--style-text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--style-text-secondary)' }}>
                  {t('common.estimatedTime', { minutes: estimatedDuration })}
                </span>
              </div>
            </div>
          )}

          {/* Instructions */}
          {instructions && instructions.length > 0 && (
            <div
              className="p-4 space-y-3"
              style={{
                backgroundColor: 'var(--style-bg-muted)',
                borderRadius: 'var(--style-radius)',
                border: '1px solid var(--style-border-muted)',
              }}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" style={{ color: 'var(--style-text-secondary)' }} />
                <h2
                  className="text-sm font-medium"
                  style={{ color: 'var(--style-text-primary)' }}
                >
                  {t('common.instructions')}
                </h2>
              </div>
              <ul className="space-y-2">
                {instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span
                      className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium shrink-0 mt-0.5"
                      style={{
                        backgroundColor: 'var(--brand-light)',
                        color: 'var(--brand)',
                      }}
                    >
                      {index + 1}
                    </span>
                    <span
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--style-text-secondary)' }}
                    >
                      {instruction}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Start Button */}
          <div className="pt-2">
            <button
              onClick={handleStartClick}
              disabled={isTransitioning}
              className="w-full px-6 py-4 text-base font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-70 hover:scale-[1.01] active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--brand)',
                color: 'var(--brand-foreground)',
                borderRadius: 'var(--style-radius)',
              }}
            >
              {t('common.startStudy')}
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Privacy Note */}
          <p
            className="text-xs text-center"
            style={{ color: 'var(--style-text-muted)' }}
          >
            {t('common.privacyNote')}
          </p>
        </FadeIn>
      </div>
    </div>
  )
}
