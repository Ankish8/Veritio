'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ButtonBounce, FadeIn } from '../css-animations'
import { useFlowSettings, usePlayerActions, useStudyId } from '@/stores/study-flow-player'
import { StepLayout, BrandedButton } from '../step-layout'
import { defaultParticipantIdentifierSettings } from '@/lib/study-flow/defaults'
import { ArrowRight, Sparkles } from 'lucide-react'
import { KeyboardShortcutHint } from '@/components/ui/keyboard-shortcut-hint'
import { useGlobalKeyboardShortcuts } from '../use-global-keyboard-shortcuts'
import { DemographicFieldRenderer } from './demographic-field-renderer'
import { getFieldLabel, validateEmail, isTextInputField } from '@/lib/demographic-utils'
import { mergePrefillData } from '@/lib/demographic-field-mapping'
import type {
  DemographicField,
  DemographicProfileSettings,
  ParticipantDemographicData,
} from '@veritio/study-types/study-flow-types'

export function IdentifierStep() {
  const flowSettings = useFlowSettings()
  const { nextStep } = usePlayerActions()
  const { type } = flowSettings.participantIdentifier

  // For anonymous type, skip directly to next step
  useEffect(() => {
    if (type === 'anonymous') {
      nextStep()
    }
  }, [type, nextStep])

  if (type === 'anonymous') return null
  if (type === 'demographic_profile') return <DemographicProfileForm />

  return null
}

function DemographicProfileForm() {
  const flowSettings = useFlowSettings()
  const studyId = useStudyId()
  const { setParticipantDemographicData, nextStep, previousStep } = usePlayerActions()

  const savedConfig = flowSettings.participantIdentifier.demographicProfile
  const defaults = defaultParticipantIdentifierSettings.demographicProfile!

  // Pre-fill state
  const [prefillData, setPrefillData] = useState<Partial<ParticipantDemographicData> | null>(null)
  const [prefillStatus, setPrefillStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle')
  const prefillFetchedForEmail = useRef<string | null>(null)
  const initialEmailFromUrl = useRef<string | null>(null)

  // Merge saved config with defaults: savedConfig values take precedence,
  // falling back to defaults for any missing fields (arrays, objects, etc.)
  const config = useMemo<DemographicProfileSettings>(() => {
    if (!savedConfig) return defaults

    // Build merged config: start with defaults, overlay savedConfig,
    // then restore any array/object fields that were null/undefined in savedConfig
    const merged = { ...defaults, ...savedConfig } as DemographicProfileSettings
    for (const key of Object.keys(defaults) as Array<keyof DemographicProfileSettings>) {
      if (merged[key] == null) {
        (merged as any)[key] = defaults[key]
      }
    }
    return merged
  }, [savedConfig, defaults])

  // Active sections with enabled fields
  const activeSections = useMemo(
    () => config.sections
      .filter(section => section.fields.some(f => f.enabled))
      .sort((a, b) => a.position - b.position),
    [config.sections]
  )

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [values, setValues] = useState<ParticipantDemographicData>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Read prefill_email from URL on mount (from widget redirect)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const prefillEmail = params.get('prefill_email')
    if (prefillEmail && validateEmail(prefillEmail) && !initialEmailFromUrl.current) {
      initialEmailFromUrl.current = prefillEmail
      // Set email value immediately to trigger prefill
      setValues(prev => ({ ...prev, email: prefillEmail })) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [])

  // Fetch pre-fill data when email changes
  useEffect(() => {
    const email = values.email
    if (!email || !studyId || !validateEmail(email)) return
    if (prefillFetchedForEmail.current === email) return // Already fetched for this email

    const fetchPrefill = async () => {
      setPrefillStatus('loading')
      try {
        const res = await fetch(`/api/studies/${studyId}/participant-prefill?email=${encodeURIComponent(email)}`)
        const data = await res.json()

        if (data.found && data.demographics) {
          prefillFetchedForEmail.current = email
          setPrefillData(data.demographics)
          setPrefillStatus('found')

          // Auto-apply pre-fill to empty fields
          setValues(prev => mergePrefillData(data.demographics, prev))
        } else {
          setPrefillStatus('not_found')
        }
      } catch {
        setPrefillStatus('not_found')
      }
    }

    // Debounce the fetch (shorter delay for URL-provided email)
    // Email validation already gates this, so a short debounce suffices
    const delay = initialEmailFromUrl.current === email ? 50 : 150
    const timer = setTimeout(fetchPrefill, delay)
    return () => clearTimeout(timer)
  }, [values.email, studyId])
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current)
    }
  }, [])

  // Skip if no active sections (check value computed early)
  const shouldSkip = activeSections.length === 0

  // Compute section indices before any early returns
  const currentSection = activeSections[currentSectionIndex] || activeSections[0]
  const isFirstSection = currentSectionIndex === 0
  const isLastSection = currentSectionIndex === activeSections.length - 1

  // === ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS ===

  // Validate current section fields
  const validateCurrentSection = useCallback((): boolean => {
    if (!currentSection) return true
    const newErrors: Record<string, string> = {}

    currentSection.fields
      .filter(f => f.enabled)
      .forEach(field => {
        if (field.required) {
          // Location field validation
          if (field.type === 'predefined' && field.fieldType === 'location') {
            const loc = values.location
            const { startLevel } = config.locationConfig

            if (startLevel === 'country' && (!loc?.country || !loc?.state || !loc?.city)) {
              newErrors[field.id] = 'Please complete all location fields'
            } else if (startLevel === 'state' && (!loc?.state || !loc?.city)) {
              newErrors[field.id] = 'Please select state and city'
            } else if (startLevel === 'city' && !loc?.city) {
              newErrors[field.id] = 'Please select a city'
            }
          } else {
            const value = field.type === 'predefined' && field.fieldType
              ? values[field.fieldType as keyof ParticipantDemographicData]
              : values[field.id]

            if (!value) {
              newErrors[field.id] = `${getFieldLabel(field)} is required`
            }
          }
        }

        // Email validation
        if (field.type === 'predefined' && field.fieldType === 'email' && values.email) {
          if (!validateEmail(values.email)) {
            newErrors[field.id] = 'Please enter a valid email address'
          }
        }
      })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [currentSection, values, config.locationConfig])

  // Reset animation when changing sections
  useEffect(() => {
    setIsTransitioning(false) // eslint-disable-line react-hooks/set-state-in-effect
    setIsAnimating(false)
  }, [currentSectionIndex])

  const proceedToNext = useCallback(() => {
    if (isLastSection) {
      setParticipantDemographicData(values)
      nextStep()
    } else {
      setCurrentSectionIndex(prev => prev + 1)
      setErrors({})
    }
  }, [isLastSection, values, setParticipantDemographicData, nextStep])

  const triggerTransition = useCallback(() => {
    if (isAnimating || !validateCurrentSection()) return
    setIsAnimating(true)
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(true)
      animationTimeoutRef.current = setTimeout(() => {
        proceedToNext()
      }, 300)
    }, 100)
  }, [isAnimating, validateCurrentSection, proceedToNext])

  const handleNext = useCallback(() => {
    if (!isAnimating) triggerTransition()
  }, [isAnimating, triggerTransition])

  const handleBack = useCallback(() => {
    if (isFirstSection) {
      previousStep()
    } else {
      setCurrentSectionIndex(prev => prev - 1)
      setErrors({})
    }
  }, [isFirstSection, previousStep])

  const updateValue = useCallback((field: DemographicField, value: unknown) => {
    const key = field.type === 'predefined' && field.fieldType ? field.fieldType : field.id
    setValues(prev => ({ ...prev, [key]: value } as ParticipantDemographicData))
    setErrors(prev => ({ ...prev, [field.id]: '' }))
  }, [])

  const getFieldValue = useCallback((field: DemographicField): unknown => {
    if (field.type === 'predefined' && field.fieldType) {
      return values[field.fieldType as keyof ParticipantDemographicData]
    }
    return values[field.id]
  }, [values])

  // Check if a field was pre-filled from panel (should be disabled/read-only)
  const isFieldPrefilledFromPanel = useCallback((field: DemographicField): boolean => {
    if (!prefillData?._sources) return false
    const key = field.type === 'predefined' && field.fieldType ? field.fieldType : field.id
    // Handle nested location field (stored as 'location.country' in _sources)
    if (key === 'location') {
      return prefillData._sources['location.country'] === 'panel'
    }
    return prefillData._sources[key] === 'panel'
  }, [prefillData])

  // Keyboard shortcuts
  useGlobalKeyboardShortcuts({
    onEnter: () => { if (!isAnimating) triggerTransition() },
    onEscape: handleBack
  })

  // Sorted enabled fields for current section
  const enabledFields = useMemo(
    () => currentSection?.fields
      .filter(f => f.enabled)
      .sort((a, b) => a.position - b.position) || [],
    [currentSection]
  )

  // Check if section has any text input fields
  const hasTextInputs = useMemo(
    () => enabledFields.some(field => {
      if (field.type === 'custom') return true
      if (field.type === 'predefined' && field.fieldType) {
        return isTextInputField(field.fieldType)
      }
      return false
    }),
    [enabledFields]
  )

  // Smart auto-advance: when all required fields are filled and no text inputs present
  useEffect(() => {
    // Don't auto-advance if there are text input fields or no current section
    if (hasTextInputs || isAnimating || !currentSection) return

    // Check if all required fields are filled
    const allRequiredFilled = enabledFields
      .filter(f => f.required)
      .every(field => {
        // Location field check
        if (field.type === 'predefined' && field.fieldType === 'location') {
          const loc = values.location
          const { startLevel } = config.locationConfig
          if (startLevel === 'country') return loc?.country && loc?.state && loc?.city
          if (startLevel === 'state') return loc?.state && loc?.city
          if (startLevel === 'city') return loc?.city
          return false
        }

        // Regular field check
        const key = field.type === 'predefined' && field.fieldType ? field.fieldType : field.id
        return !!values[key as keyof ParticipantDemographicData]
      })

    if (allRequiredFilled && validateCurrentSection()) { // eslint-disable-line react-hooks/set-state-in-effect
      // Clear any existing timeout
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current)
      }

      // Trigger auto-advance after a brief delay
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        triggerTransition()
      }, 500)
    }

    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current)
      }
    }
  }, [values, enabledFields, hasTextInputs, isAnimating, validateCurrentSection, triggerTransition, config.locationConfig, currentSection])

  // Skip effect (must run AFTER all hooks)
  useEffect(() => {
    if (shouldSkip) nextStep()
  }, [shouldSkip, nextStep])

  // === EARLY RETURN AFTER ALL HOOKS ===
  if (shouldSkip) return null

  return (
    <StepLayout
      title={config.title || 'Participant Information'}
      subtitle={config.description}
      showBackButton={!isFirstSection}
      onBack={handleBack}
      actions={
        <div className="flex justify-end">
          <ButtonBounce isActive={isTransitioning}>
            <BrandedButton onClick={handleNext}>
              {isLastSection ? 'Continue' : 'Next'}
              <ArrowRight className="ml-2 h-4 w-4" />
              <KeyboardShortcutHint shortcut="enter" variant="dark" />
            </BrandedButton>
          </ButtonBounce>
        </div>
      }
    >
      <div className="space-y-6 w-full max-w-2xl">
        {/* Section header */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            {currentSection.title || currentSection.name}
          </h2>
          {currentSection.description && (
            <p className="text-sm text-muted-foreground">{currentSection.description}</p>
          )}
          {/* Progress indicator for multiple sections */}
          {activeSections.length > 1 && (
            <div className="flex items-center gap-1 pt-2">
              {activeSections.map((_, index) => (
                <div
                  key={index}
                  className={`h-0.5 flex-1 rounded-full transition-all ${
                    index <= currentSectionIndex ? 'bg-border' : 'bg-muted/40'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Pre-fill indicator */}
          {prefillStatus === 'found' && prefillData && (
            <FadeIn
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 text-primary text-sm"
              direction="down"
            >
              <Sparkles className="h-4 w-4" />
              <span>Some fields were pre-filled from your profile</span>
            </FadeIn>
          )}
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enabledFields.map(field => (
            <DemographicFieldRenderer
              key={field.id}
              field={field}
              config={config}
              value={getFieldValue(field)}
              onChange={(value) => updateValue(field, value)}
              error={errors[field.id]}
              disabled={isFieldPrefilledFromPanel(field)}
            />
          ))}
        </div>
      </div>
    </StepLayout>
  )
}
