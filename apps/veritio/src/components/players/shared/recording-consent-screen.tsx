'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { ButtonBounce } from '@/components/study-flow/player/css-animations'
import { Video, Mic, Monitor, Camera, AlertCircle, Check, Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { DEFAULT_PRIVACY_NOTICE } from '@/components/builders/shared/types'
import type { RecordingCaptureMode } from '@/components/builders/shared/types'

export type StudyType = 'card_sort' | 'tree_test' | 'prototype_test' | 'first_click' | 'first_impression' | 'survey' | 'live_website_test'

export interface RecordingConsentScreenProps {
  captureMode: RecordingCaptureMode
  studyType?: StudyType
  onConsent: (streams?: MediaStream[]) => void
  onDecline: () => void
  allowDecline?: boolean
  privacyNotice?: string[]
  requestPermissionsInline?: boolean
  preferFullScreen?: boolean
}

function getActivityDescription(studyType: StudyType | undefined): string {
  switch (studyType) {
    case 'card_sort':
      return 'sort cards into categories'
    case 'tree_test':
      return 'navigate the information structure'
    case 'prototype_test':
      return 'interact with the prototype'
    case 'first_click':
      return 'complete click tasks'
    case 'first_impression':
      return 'view and react to designs'
    case 'survey':
      return 'complete the survey'
    case 'live_website_test':
      return 'interact with the website'
    default:
      return 'complete the study'
  }
}

interface ConsentItem {
  id: string
  icon: React.ReactNode
  label: string
  description: string
  required: boolean
}

type PermissionStatus = 'idle' | 'pending' | 'granted' | 'denied' | 'wrong_surface'

export function RecordingConsentScreen({
  captureMode,
  studyType,
  onConsent,
  onDecline,
  allowDecline = true,
  privacyNotice,
  requestPermissionsInline = false,
  preferFullScreen = false,
}: RecordingConsentScreenProps) {
  const t = useTranslations()
  const activity = getActivityDescription(studyType)
  const [consents, setConsents] = useState<Record<string, boolean>>({})
  const [permissionStatuses, setPermissionStatuses] = useState<Record<string, PermissionStatus>>({})
  const [permissionErrors, setPermissionErrors] = useState<Record<string, string>>({})
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const continueButtonRef = useRef<HTMLButtonElement | null>(null)
  // Store granted streams so they aren't garbage-collected before recording starts
  const streamsRef = useRef<MediaStream[]>([])

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
      // Stop any streams if the component unmounts without consenting
      // (streams will be re-requested by startRecording)
    }
  }, [])

  // Use custom privacy notice if provided, otherwise use defaults
  const privacyItems = privacyNotice && privacyNotice.length > 0 ? privacyNotice : DEFAULT_PRIVACY_NOTICE

  // Build consent items based on capture mode
  const consentItems: ConsentItem[] = []

  if (captureMode === 'audio' || captureMode === 'screen_and_audio' || captureMode === 'video_and_audio') {
    consentItems.push({
      id: 'microphone',
      icon: <Mic className="h-5 w-5" />,
      label: t('recording.microphoneLabel'),
      description: t('recording.microphoneDescription'),
      required: true,
    })
  }

  if (captureMode === 'screen_and_audio' || captureMode === 'video_and_audio' || captureMode === 'screen_only' || captureMode === 'video_only') {
    consentItems.push({
      id: 'screen',
      icon: <Monitor className="h-5 w-5" />,
      label: t('recording.screenLabel'),
      description: requestPermissionsInline && preferFullScreen
        ? 'Your entire screen will be recorded. You must select "Entire Screen" when prompted.'
        : t('recording.screenDescription', { activity }),
      required: true,
    })
  }

  if (captureMode === 'video_and_audio' || captureMode === 'video_only') {
    consentItems.push({
      id: 'webcam',
      icon: <Camera className="h-5 w-5" />,
      label: t('recording.webcamLabel'),
      description: t('recording.webcamDescription'),
      required: true,
    })
  }

  // Request a browser permission for a specific consent item
  const requestPermission = useCallback(async (itemId: string) => {
    setPermissionStatuses(prev => ({ ...prev, [itemId]: 'pending' }))
    setPermissionErrors(prev => ({ ...prev, [itemId]: '' }))

    try {
      if (itemId === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamsRef.current.push(stream)
        setPermissionStatuses(prev => ({ ...prev, [itemId]: 'granted' }))
      } else if (itemId === 'screen') {
        const displayMediaOptions = preferFullScreen
          ? {
              video: { displaySurface: 'monitor' },
              audio: false,
              preferCurrentTab: false,
              selfBrowserSurface: 'exclude',
              surfaceSwitching: 'exclude',
              monitorTypeSurfaces: 'include',
            }
          : { video: true, audio: false }

        const stream = await navigator.mediaDevices.getDisplayMedia(
          displayMediaOptions as DisplayMediaStreamOptions
        )

        // Validate full screen if required
        if (preferFullScreen) {
          const surfaceType = stream.getVideoTracks()[0]?.getSettings()?.displaySurface
          if (surfaceType && surfaceType !== 'monitor') {
            stream.getTracks().forEach(track => track.stop())
            setPermissionStatuses(prev => ({ ...prev, [itemId]: 'wrong_surface' }))
            setPermissionErrors(prev => ({
              ...prev,
              [itemId]: 'Please select "Entire Screen" — not a tab or window. Click to try again.',
            }))
            setConsents(prev => ({ ...prev, [itemId]: false }))
            return
          }
        }

        streamsRef.current.push(stream)
        setPermissionStatuses(prev => ({ ...prev, [itemId]: 'granted' }))
      } else if (itemId === 'webcam') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        streamsRef.current.push(stream)
        setPermissionStatuses(prev => ({ ...prev, [itemId]: 'granted' }))
      }
    } catch {
      setPermissionStatuses(prev => ({ ...prev, [itemId]: 'denied' }))
      setPermissionErrors(prev => ({
        ...prev,
        [itemId]: 'Permission denied. Click to try again.',
      }))
      setConsents(prev => ({ ...prev, [itemId]: false }))
    }
  }, [preferFullScreen])

  // In inline mode, check if all permissions are actually granted
  const allPermissionsGranted = requestPermissionsInline
    ? consentItems.every(item => permissionStatuses[item.id] === 'granted')
    : false

  // Check if all required consents are granted (checkbox mode)
  const allConsentsGranted = requestPermissionsInline
    ? allPermissionsGranted
    : consentItems.every(item => consents[item.id] === true)

  // After getDisplayMedia() resolves, Chrome's "Stop sharing" bar steals focus.
  // We delay focusing the continue button so it happens AFTER Chrome settles,
  // letting the user click/press Enter immediately without dismissing the bar first.
  useEffect(() => {
    if (allConsentsGranted && requestPermissionsInline) {
      const timer = setTimeout(() => {
        continueButtonRef.current?.focus()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [allConsentsGranted, requestPermissionsInline])

  const handleConsentToggle = useCallback((itemId: string, checked: boolean) => {
    if (requestPermissionsInline) {
      // In inline mode, clicking triggers the permission request
      if (checked && permissionStatuses[itemId] !== 'granted') {
        setConsents(prev => ({ ...prev, [itemId]: true }))
        requestPermission(itemId)
      }
      // Don't allow unchecking once granted
      return
    }
    setConsents(prev => ({ ...prev, [itemId]: checked }))
  }, [requestPermissionsInline, permissionStatuses, requestPermission])

  // Handle clicking on a denied/wrong_surface item to retry
  const handleRetry = useCallback((itemId: string) => {
    setConsents(prev => ({ ...prev, [itemId]: true }))
    requestPermission(itemId)
  }, [requestPermission])

  // Pass pre-acquired streams to onConsent (inline mode) or just call onConsent (checkbox mode)
  const handleConsent = useCallback(() => {
    if (requestPermissionsInline && streamsRef.current.length > 0) {
      onConsent(streamsRef.current)
      streamsRef.current = [] // Ownership transferred to caller
    } else {
      onConsent()
    }
  }, [onConsent, requestPermissionsInline])

  // Typeform-style transition for consent button
  const triggerTransition = useCallback(() => {
    if (isAnimating || !allConsentsGranted) return
    setIsAnimating(true)
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(true)
      animationTimeoutRef.current = setTimeout(() => {
        handleConsent()
      }, 300)
    }, 100)
  }, [isAnimating, allConsentsGranted, handleConsent])

  const handleConsentClick = useCallback(() => {
    if (!isAnimating) triggerTransition()
  }, [isAnimating, triggerTransition])

  // Render permission status badge for inline mode
  const renderPermissionBadge = (itemId: string) => {
    if (!requestPermissionsInline) return null
    const status = permissionStatuses[itemId]
    if (!status || status === 'idle') return null

    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand)' }}>
          <Loader2 className="h-3 w-3 animate-spin" />
          Waiting...
        </span>
      )
    }
    if (status === 'granted') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">
          <Check className="h-3 w-3" />
          Granted
        </span>
      )
    }
    // denied or wrong_surface
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRetry(itemId) }}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors cursor-pointer border border-red-200"
      >
        Click to retry
      </button>
    )
  }

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
          {/* Header */}
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
              {requestPermissionsInline
                ? 'Grant each permission below to continue. Your browser will ask for access when you click each item.'
                : t('recording.consentDescription', { activity })}
            </p>
          </div>

          {/* Consent Items */}
          <div className="space-y-4">
            <h2
              className="text-sm font-medium uppercase tracking-wide"
              style={{ color: 'var(--style-text-secondary)' }}
            >
              {requestPermissionsInline ? 'Permissions required' : t('recording.whatWillBeRecorded')}
            </h2>
            {consentItems.map((item) => {
              const status = permissionStatuses[item.id]
              const isGranted = status === 'granted'
              const isDenied = status === 'denied' || status === 'wrong_surface'
              const isPending = status === 'pending'
              const errorMsg = permissionErrors[item.id]

              return (
                <div key={item.id}>
                  <label
                    className={`flex items-start gap-4 p-4 transition-colors ${isPending ? 'pointer-events-none opacity-70' : 'cursor-pointer'}`}
                    style={{
                      borderRadius: 'var(--style-radius)',
                      border: isGranted
                        ? '1px solid var(--brand)'
                        : isDenied
                          ? '1px solid #fca5a5'
                          : consents[item.id]
                            ? '1px solid var(--brand)'
                            : '1px solid var(--style-card-border)',
                      backgroundColor: isGranted
                        ? 'var(--brand-subtle)'
                        : isDenied
                          ? '#fef2f2'
                          : consents[item.id]
                            ? 'var(--brand-subtle)'
                            : 'transparent',
                    }}
                    onClick={requestPermissionsInline && (isDenied || (!isGranted && !isPending && !consents[item.id]))
                      ? (e) => {
                          e.preventDefault()
                          handleConsentToggle(item.id, true)
                        }
                      : undefined}
                  >
                    <Checkbox
                      id={item.id}
                      branded
                      checked={isGranted || consents[item.id] || false}
                      disabled={requestPermissionsInline && (isGranted || isPending)}
                      onCheckedChange={(checked) => handleConsentToggle(item.id, checked === true)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--style-text-primary)' }}>{item.icon}</span>
                        <Label
                          htmlFor={requestPermissionsInline ? undefined : item.id}
                          className="font-medium cursor-pointer"
                          style={{ color: 'var(--style-text-primary)' }}
                        >
                          {item.label}
                        </Label>
                        {renderPermissionBadge(item.id)}
                        {!requestPermissionsInline && item.required && (
                          <span className="text-xs text-destructive">{t('common.required')}</span>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: 'var(--style-text-secondary)' }}>
                        {item.description}
                      </p>
                    </div>
                  </label>
                  {/* Error message for denied/wrong surface */}
                  {requestPermissionsInline && errorMsg && (
                    <p className="text-xs mt-1.5 ml-12 text-red-600">{errorMsg}</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Privacy Notice */}
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

          {/* Actions */}
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
            <ButtonBounce isActive={isTransitioning} className="flex-1">
              <button
                ref={continueButtonRef}
                onClick={handleConsentClick}
                disabled={!allConsentsGranted}
                className="w-full px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  backgroundColor: allConsentsGranted ? 'var(--brand)' : 'var(--brand-muted)',
                  color: 'var(--brand-foreground)',
                  borderRadius: 'var(--style-radius)',
                }}
              >
                <Check className="h-4 w-4" />
                {allConsentsGranted
                  ? (requestPermissionsInline ? 'All permissions granted — Continue' : t('recording.consentButton'))
                  : (requestPermissionsInline ? 'Grant all permissions to continue' : t('recording.selectAllToContinue'))}
              </button>
            </ButtonBounce>
          </div>

          {/* Mobile Note */}
          {(captureMode === 'screen_and_audio' || captureMode === 'video_and_audio' || captureMode === 'screen_only' || captureMode === 'video_only') && (
            <p className="text-xs text-center" style={{ color: 'var(--style-text-secondary)' }}>
              {t('recording.mobileNote')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
