'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Lightbulb, HelpCircle, Quote, ArrowRight } from 'lucide-react'
import { FadeIn } from '@/components/study-flow/player/css-animations'

export interface ThinkAloudEducationScreenProps {
  onComplete: () => void
}

const EDUCATION_TIPS = [
  {
    icon: MessageCircle,
    title: 'Speak your thoughts out loud',
    description: 'Share everything that comes to mind as you work through the tasks.',
  },
  {
    icon: Lightbulb,
    title: 'Share what you see and feel',
    description: 'Tell us what catches your attention, what you expect, and how you feel.',
  },
  {
    icon: HelpCircle,
    title: 'Mention any confusion',
    description: "It's especially helpful when you're unsure or something doesn't make sense.",
  },
]

const EXAMPLE_PHRASES = [
  "I'm looking for...",
  'I expected this to...',
  "I'm not sure what this means...",
  'This button seems to...',
  "I'm confused because...",
  'I thought this would...',
]

export function ThinkAloudEducationScreen({
  onComplete,
}: ThinkAloudEducationScreenProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    }
  }, [])

  const handleContinue = () => {
    if (isTransitioning) return

    setIsTransitioning(true)
    transitionTimeoutRef.current = setTimeout(() => {
      onComplete()
    }, 300)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--style-bg)' }}
    >
      <div
        className="w-full max-w-lg space-y-6"
        style={{
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? 'translateY(-20px)' : 'translateY(0)',
          transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <FadeIn
            delay={0.1}
            duration={0.3}
            className="inline-flex items-center justify-center w-14 h-14 rounded-full"
            style={{ backgroundColor: 'var(--brand-subtle)' }}
          >
            <MessageCircle className="h-7 w-7" style={{ color: 'var(--brand)' }} />
          </FadeIn>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--style-text-primary)' }}>
            Think Aloud While You Work
          </h1>
          <p style={{ color: 'var(--style-text-secondary)' }}>
            We&apos;d love to hear your thoughts as you complete the tasks.
            This helps us understand your experience better.
          </p>
        </div>

        {/* Tips */}
        <div className="space-y-3">
          <h2
            className="text-sm font-medium uppercase tracking-wide"
            style={{ color: 'var(--style-text-secondary)' }}
          >
            How to Think Aloud
          </h2>
          {EDUCATION_TIPS.map((tip, index) => (
            <FadeIn
              key={tip.title}
              delay={0.15 + index * 0.1}
              duration={0.3}
              className="flex items-start gap-3 p-4"
              style={{
                borderRadius: 'var(--style-radius)',
                backgroundColor: 'var(--style-card-bg)',
                border: '1px solid var(--style-card-border)',
              }}
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--brand-subtle)' }}
              >
                <tip.icon className="w-4 h-4" style={{ color: 'var(--brand)' }} />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-medium text-sm" style={{ color: 'var(--style-text-primary)' }}>
                  {tip.title}
                </p>
                <p className="text-sm" style={{ color: 'var(--style-text-secondary)' }}>
                  {tip.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Example Phrases */}
        <FadeIn
          delay={0.5}
          duration={0.3}
          className="p-4"
          style={{
            borderRadius: 'var(--style-radius)',
            backgroundColor: 'var(--style-card-border)',
          }}
        >
          <div className="flex items-start gap-3">
            <Quote className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--brand)' }} />
            <div className="flex-1 space-y-2">
              <p className="font-medium text-sm" style={{ color: 'var(--style-text-primary)' }}>
                Example phrases you can use:
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PHRASES.map((phrase) => (
                  <span
                    key={phrase}
                    className="inline-block px-2.5 py-1 text-xs rounded-full"
                    style={{
                      backgroundColor: 'var(--style-bg)',
                      color: 'var(--style-text-secondary)',
                    }}
                  >
                    &ldquo;{phrase}&rdquo;
                  </span>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Continue Button */}
        <FadeIn delay={0.6} duration={0.3} className="pt-2">
          <button
            onClick={handleContinue}
            disabled={isTransitioning}
            className="w-full px-4 py-3.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--brand)',
              color: 'var(--brand-foreground)',
              borderRadius: 'var(--style-radius)',
            }}
          >
            Got it, let&apos;s start
            <ArrowRight className="w-4 h-4" />
          </button>
        </FadeIn>

        {/* Reassurance */}
        <p className="text-xs text-center" style={{ color: 'var(--style-text-secondary)' }}>
          Don&apos;t worry about being perfect—just share what comes naturally!
        </p>
      </div>
    </div>
  )
}
