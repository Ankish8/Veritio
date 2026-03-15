'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Video, Mic, Monitor, Camera, AlertCircle, Check } from 'lucide-react'
import { Checkbox } from '@veritio/ui/components/checkbox'
import { Label } from '@veritio/ui/components/label'
import { DEFAULT_PRIVACY_NOTICE } from '../../types/player-types'
import type { RecordingCaptureMode } from '../../types/player-types'
import type { StudyType } from '../../types'

export interface RecordingConsentScreenProps {
  captureMode: RecordingCaptureMode
  studyType?: StudyType
  onConsent: () => void
  onDecline: () => void
  allowDecline?: boolean
  privacyNotice?: string[]
}

const ACTIVITY_DESCRIPTIONS: Record<string, string> = {
  card_sort: 'sort cards into categories',
  tree_test: 'navigate the information structure',
  prototype_test: 'interact with the prototype',
  first_click: 'complete click tasks',
  first_impression: 'view and react to designs',
  survey: 'complete the survey',
  live_website_test: 'complete tasks on a live website',
}

interface ConsentItem {
  id: string
  icon: React.ReactNode
  label: string
  description: string
  required: boolean
}

export function RecordingConsentScreen({
  captureMode,
  studyType,
  onConsent,
  onDecline,
  allowDecline = true,
  privacyNotice,
}: RecordingConsentScreenProps) {
  const t = useTranslations()
  const activity = (studyType && ACTIVITY_DESCRIPTIONS[studyType]) || 'complete the study'
  const [consents, setConsents] = useState<Record<string, boolean>>({})
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    }
  }, [])

  const privacyItems = privacyNotice && privacyNotice.length > 0
    ? privacyNotice
    : [DEFAULT_PRIVACY_NOTICE]

  const hasAudio = captureMode === 'audio' || captureMode === 'screen_and_audio' || captureMode === 'video_and_audio'
  const hasScreen = captureMode === 'screen_and_audio' || captureMode === 'video_and_audio'
  const hasWebcam = captureMode === 'video_and_audio'

  const consentItems = [
    hasAudio && {
      id: 'microphone',
      icon: <Mic className="h-5 w-5" /> as React.ReactNode,
      label: t('recording.microphoneLabel'),
      description: t('recording.microphoneDescription'),
      required: true,
    },
    hasScreen && {
      id: 'screen',
      icon: <Monitor className="h-5 w-5" /> as React.ReactNode,
      label: t('recording.screenLabel'),
      description: t('recording.screenDescription', { activity }),
      required: true,
    },
    hasWebcam && {
      id: 'webcam',
      icon: <Camera className="h-5 w-5" /> as React.ReactNode,
      label: t('recording.webcamLabel'),
      description: t('recording.webcamDescription'),
      required: true,
    },
  ].filter(Boolean) as ConsentItem[]

  const allConsentsGranted = consentItems.every(item => consents[item.id] === true)

  const handleConsentToggle = (itemId: string, checked: boolean) => {
    setConsents(prev => ({ ...prev, [itemId]: checked }))
  }

  const handleConsentClick = useCallback(() => {
    if (isTransitioning || !allConsentsGranted) return
    setIsTransitioning(true)
    transitionTimeoutRef.current = setTimeout(() => {
      onConsent()
    }, 400)
  }, [isTransitioning, allConsentsGranted, onConsent])

  return (
    <div
      className="flex items-center justify-center min-h-screen p-4"
      style={{ backgroundColor: 'var(--style-page-bg)' }}
    >
      <div className="w-full max-w-2xl">
        <div
          className="p-8 space-y-6"
          style={{
            backgroundColor: 'var(--style-card-bg)',
            border: '1px solid var(--style-card-border)',
            borderRadius: 'var(--style-radius-lg)',
            boxShadow: 'var(--style-shadow)',
          }}
        >
          <div className="text-center space-y-2">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ backgroundColor: 'var(--brand-light)' }}
            >
              <Video className="h-8 w-8" style={{ color: 'var(--brand)' }} />
            </div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--style-text-primary)' }}>
              {t('recording.consentTitle')}
            </h1>
            <p style={{ color: 'var(--style-text-secondary)' }}>
              {t('recording.consentDescription', { activity })}
            </p>
          </div>

          <div className="space-y-4">
            <h2
              className="text-sm font-medium uppercase tracking-wide"
              style={{ color: 'var(--style-text-secondary)' }}
            >
              {t('recording.whatWillBeRecorded')}
            </h2>
            {consentItems.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-4 p-4 cursor-pointer transition-colors"
                style={{
                  borderRadius: 'var(--style-radius)',
                  border: consents[item.id]
                    ? '1px solid var(--brand)'
                    : '1px solid var(--style-card-border)',
                  backgroundColor: consents[item.id]
                    ? 'var(--brand-subtle)'
                    : 'transparent',
                }}
              >
                <Checkbox
                  id={item.id}
                  branded
                  checked={consents[item.id] || false}
                  onCheckedChange={(checked: boolean) => handleConsentToggle(item.id, checked === true)}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--style-text-primary)' }}>{item.icon}</span>
                    <Label
                      htmlFor={item.id}
                      className="font-medium cursor-pointer"
                      style={{ color: 'var(--style-text-primary)' }}
                    >
                      {item.label}
                    </Label>
                    {item.required && (
                      <span className="text-xs text-destructive">{t('common.required')}</span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--style-text-secondary)' }}>
                    {item.description}
                  </p>
                </div>
              </label>
            ))}
          </div>

          <div
            className="flex items-start gap-3 p-4"
            style={{
              borderRadius: 'var(--style-radius)',
              backgroundColor: 'var(--style-card-border)',
            }}
          >
            <AlertCircle
              className="h-5 w-5 shrink-0 mt-0.5"
              style={{ color: 'var(--style-text-secondary)' }}
            />
            <div className="flex-1 space-y-2 text-sm" style={{ color: 'var(--style-text-secondary)' }}>
              <p className="font-medium" style={{ color: 'var(--style-text-primary)' }}>
                {t('recording.privacyTitle')}
              </p>
              <ul className="space-y-1 list-disc list-inside">
                {privacyItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4">
            {allowDecline && (
              <button
                onClick={onDecline}
                className="flex-1 px-4 py-3 text-sm font-medium transition-colors hover:opacity-80"
                style={{
                  color: 'var(--style-text-primary)',
                  borderRadius: 'var(--style-radius)',
                }}
              >
                {t('recording.continueWithoutRecording')}
              </button>
            )}
            <motion.div
              className="flex-1"
              animate={isTransitioning ? {
                scale: [1, 0.97, 1.01, 1],
              } : {}}
              transition={{
                duration: 0.25,
                ease: 'easeOut',
              }}
            >
              <button
                onClick={handleConsentClick}
                disabled={!allConsentsGranted}
                className="w-full px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: allConsentsGranted ? 'var(--brand)' : 'var(--brand-muted)',
                  color: 'var(--brand-foreground)',
                  borderRadius: 'var(--style-radius)',
                }}
              >
                <Check className="h-4 w-4" />
                {allConsentsGranted ? t('recording.consentButton') : t('recording.selectAllToContinue')}
              </button>
            </motion.div>
          </div>

          {(captureMode === 'screen_and_audio' || captureMode === 'video_and_audio') && (
            <p className="text-xs text-center" style={{ color: 'var(--style-text-secondary)' }}>
              {t('recording.mobileNote')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
