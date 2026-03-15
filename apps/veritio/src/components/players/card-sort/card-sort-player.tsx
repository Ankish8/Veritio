'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

import {
  WelcomeScreen,
  ErrorScreen,
  SubmittingScreen,
  CompleteScreen,
} from './screens'
import { RecordingConsentScreen } from '../shared/recording-consent-screen'
import { ThinkAloudEducationScreen } from '../shared/think-aloud-education-screen'
import { DesktopSortingView } from './desktop-sorting-view'
import { MobileSortingView } from './mobile-sorting-view'
import {
  useCardSortDragState,
  useCustomCategoryState,
  useCardSortValidation,
  useCardSortSession,
} from '@/hooks/card-sort'
import { usePlayerRecording } from '@/hooks/use-player-recording'
import { useStudyFlowPlayerStore } from '@/stores/study-flow-player'
import type { CardSortPlayerProps, PlacedCard } from './card-sort-types'
import { UNCLEAR_CATEGORY_ID, getSubmitDisabledReason } from './card-sort-types'

export function CardSortPlayer({
  studyId,
  shareCode,
  cards: initialCards,
  categories: initialCategories,
  settings,
  welcomeMessage,
  thankYouMessage,
  instructions,
  embeddedMode = false,
  previewMode = false,
  onComplete,
  branding,
  previewBanner,
  preventionData,
  sessionToken: externalSessionToken,
  participantId: externalParticipantId,
}: CardSortPlayerProps) {
  const [placedCards, setPlacedCards] = useState<PlacedCard[]>([])
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [recordingDecisionMade, setRecordingDecisionMade] = useState(false)
  const [thinkAloudEducationComplete, setThinkAloudEducationComplete] = useState(false)

  // Mobile layout detection – initialise synchronously to avoid layout flash
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  )
  useEffect(() => {
    const handleResize = () => setIsMobileLayout(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Get demographic data from study flow store (collected during identifier step)
  const participantDemographicData = useStudyFlowPlayerStore(
    (state) => state.participantDemographicData
  )

  // Session management hook
  const {
    state,
    sessionToken,
    participantId,
    errorMessage,
    handleStart: sessionHandleStart,
    handleSubmit: sessionHandleSubmit,
    validationError,
    setValidationError,
  } = useCardSortSession({
    shareCode,
    embeddedMode,
    previewMode,
    onComplete,
    preventionData,
    demographicData: participantDemographicData,
    externalSessionToken,
    externalParticipantId,
  })

  // Combined recording hook (session recording, event capture, silence detection, think-aloud)
  const {
    recordingEnabled,
    thinkAloudSettings,
    isRecording,
    isPaused,
    isUploading,
    uploadProgress,
    recordingError,
    startRecording,
    captureCustomEvent,
    audioLevel,
    isSpeaking,
    showPrompt,
    currentPrompt,
    dismissPrompt,
    stopRecordingWithTranscript,
  } = usePlayerRecording({
    studyId,
    participantId: participantId || '',
    sessionToken: sessionToken || '',
    recordingSettings: settings.sessionRecordingSettings,
  })

  // Recording consent handlers
  const handleRecordingConsent = useCallback(async () => {
    setRecordingDecisionMade(true)
    try {
      await startRecording()
    } catch {
      // Recording failed to start - continue without it
    }
  }, [startRecording])

  const handleRecordingDecline = useCallback(() => {
    setRecordingDecisionMade(true)
  }, [])

  const handleSubmit = useCallback(async (
    placedCards: { cardId: string; categoryId: string }[],
    customCategories: { id: string; label: string }[],
    allCategories: { id: string; label: string }[],
    validationErrors: string[]
  ) => {
    await stopRecordingWithTranscript()
    await sessionHandleSubmit(placedCards, customCategories, allCategories, validationErrors)
  }, [stopRecordingWithTranscript, sessionHandleSubmit])

  // Custom category management hook
  const {
    customCategories,
    newCategoryName,
    showNewCategoryForm,
    editingCategoryId,
    editingCategoryName,
    categoryToDelete,
    setNewCategoryName,
    setShowNewCategoryForm,
    setEditingCategoryName,
    setCategoryToDelete,
    handleCreateCategory: baseCreateCategory,
    createCategoryWithName: baseCreateCategoryWithName,
    handleCreateUnnamedCategory,
    handleStartEditCategory,
    handleSaveEditCategory,
    handleCancelEditCategory,
    handleDeleteCategory,
    confirmDeleteCategory,
  } = useCustomCategoryState({ setPlacedCards })

  // Wrapped category creation with recording event capture
  const handleCreateCategory = useCallback(() => {
    if (newCategoryName.trim()) {
      captureCustomEvent('category_created', {
        category_name: newCategoryName.trim(),
      })
    }
    baseCreateCategory()
  }, [baseCreateCategory, captureCustomEvent, newCategoryName])

  // Direct category creation with name (for mobile sheet inline create)
  const createCategoryWithName = useCallback((name: string): string => {
    captureCustomEvent('category_created', { category_name: name.trim() })
    return baseCreateCategoryWithName(name)
  }, [baseCreateCategoryWithName, captureCustomEvent])

  // DnD sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Randomize cards if setting is enabled
  const cards = useMemo(() => {
    const safeCards = Array.isArray(initialCards) ? initialCards : []
    if (settings.randomizeCards) {
      // eslint-disable-next-line react-hooks/purity
      return [...safeCards].sort(() => Math.random() - 0.5)
    }
    return safeCards
  }, [initialCards, settings.randomizeCards])

  // Predefined categories - only show for closed/hybrid modes, not open
  const shuffledPredefinedCategories = useMemo(() => {
    const safeCategories = Array.isArray(initialCategories) ? initialCategories : []
    if (settings.mode === 'open') {
      return []
    }
    if (settings.randomizeCategories) {
      // eslint-disable-next-line react-hooks/purity
      return [...safeCategories].sort(() => Math.random() - 0.5)
    }
    return safeCategories
  }, [initialCategories, settings.randomizeCategories, settings.mode])

  const unclearCategory = useMemo(() => {
    if (!settings.includeUnclearCategory) return null
    return {
      id: UNCLEAR_CATEGORY_ID,
      label: 'Unclear',
      description: 'Place cards here that you find confusing or don\'t clearly fit any category.',
      study_id: studyId,
      position: 9999,
      created_at: null,
    }
  }, [settings.includeUnclearCategory, studyId])

  const canCreateCategory = settings.mode === 'open' || settings.mode === 'hybrid'

  const availableCards = cards.filter(
    (card) => !placedCards.some((p) => p.cardId === card.id)
  )

  const allCategories = useMemo(() => [
    ...shuffledPredefinedCategories,
    ...(unclearCategory ? [unclearCategory] : []),
    ...customCategories,
  ], [shuffledPredefinedCategories, unclearCategory, customCategories])

  const {
    activeId,
    hoveredCategoryId,
    handleDragStart: baseDragStart,
    handleDragOver,
    handleDragEnd: baseDragEnd,
  } = useCardSortDragState({
    allCategories,
    placedCards,
    setPlacedCards,
    onCreateUnnamedCategory: canCreateCategory ? handleCreateUnnamedCategory : undefined,
  })

  // Wrapped drag handlers with recording event capture
  const handleDragStart = useCallback((event: Parameters<typeof baseDragStart>[0]) => {
    const cardId = event.active.id as string
    const card = cards.find(c => c.id === cardId)
    captureCustomEvent('drag_start', {
      card_id: cardId,
      card_label: card?.label || '',
    })
    baseDragStart(event)
  }, [baseDragStart, captureCustomEvent, cards])

  const handleDragEnd = useCallback((event: Parameters<typeof baseDragEnd>[0]) => {
    const cardId = event.active.id as string
    const overId = event.over?.id as string | undefined
    const card = cards.find(c => c.id === cardId)
    const targetCategory = allCategories.find(c => c.id === overId)

    if (targetCategory) {
      captureCustomEvent('card_drop', {
        card_id: cardId,
        card_label: card?.label || '',
        category_id: targetCategory.id,
        category_label: targetCategory.label,
      })
    }
    baseDragEnd(event)
  }, [baseDragEnd, captureCustomEvent, cards, allCategories])

  const { getValidationErrors, canSubmit } = useCardSortValidation({
    cards,
    placedCardsCount: placedCards.length,
    customCategories,
    settings,
  })

  const getCardsInCategory = useCallback((categoryId: string) => {
    const cardIds = placedCards
      .filter((p) => p.categoryId === categoryId)
      .map((p) => p.cardId)
    return cards.filter((c) => cardIds.includes(c.id))
  }, [placedCards, cards])

  const toggleCategoryCollapsed = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const onSubmitClick = () => {
    handleSubmit(placedCards, customCategories, allCategories, getValidationErrors())
  }

  const activeCard = activeId ? cards.find((c) => c.id === activeId) ?? null : null

  // Branding values
  const finishedButtonText = branding?.buttonText?.finished || 'Finished'

  const unnamedCategoriesCount = customCategories.filter(c => !c.label.trim()).length
  const submitDisabledReason = getSubmitDisabledReason(unnamedCategoriesCount, availableCards.length, settings.mode)

  const recordingProps = (isRecording || isUploading) ? {
    isRecording,
    isPaused,
    isUploading,
    uploadProgress,
  } : undefined

  // Screen state rendering
  if (state === 'welcome') {
    return <WelcomeScreen welcomeMessage={welcomeMessage} onStart={sessionHandleStart} />
  }

  // Recording consent screen (shown after welcome, before sorting if recording enabled)
  if (state === 'sorting' && recordingEnabled && !recordingDecisionMade && !recordingError) {
    return (
      <RecordingConsentScreen
        captureMode={settings.sessionRecordingSettings?.captureMode || 'audio'}
        studyType="card_sort"
        onConsent={handleRecordingConsent}
        onDecline={handleRecordingDecline}
        allowDecline
        privacyNotice={settings.sessionRecordingSettings?.privacyNotice}
      />
    )
  }

  // Think-aloud education screen (shown after consent if enabled)
  const needsThinkAloudEducation = recordingDecisionMade && thinkAloudSettings.enabled && thinkAloudSettings.showEducation && !thinkAloudEducationComplete
  if (state === 'sorting' && needsThinkAloudEducation) {
    return <ThinkAloudEducationScreen onComplete={() => setThinkAloudEducationComplete(true)} />
  }

  if (state === 'error') {
    return <ErrorScreen errorMessage={errorMessage} />
  }
  if (state === 'submitting') {
    return <SubmittingScreen />
  }
  if (state === 'complete') {
    if (embeddedMode) return null
    return <CompleteScreen thankYouMessage={thankYouMessage} />
  }

  // Shared props for both mobile and desktop views
  const sharedProps = {
    instructions,
    showInstructionsModal,
    onSetShowInstructionsModal: setShowInstructionsModal,
    fallbackInstructions: branding?.cardSortInstructions,
    validationError,
    onClearValidationError: () => setValidationError(null),
    categoryToDelete,
    onSetCategoryToDelete: setCategoryToDelete,
    onConfirmDeleteCategory: confirmDeleteCategory,
    recording: recordingProps,
    recordingError,
    thinkAloudEnabled: thinkAloudSettings.enabled,
    audioLevel,
    isSpeaking,
    showPrompt,
    currentPrompt,
    dismissPrompt,
    promptPosition: thinkAloudSettings.promptPosition,
    previewBanner,
    settings,
    onSubmitClick,
    canSubmit,
    submitDisabledReason,
    finishedButtonText,
    unnamedCategoriesCount,
  } as const

  // Mobile sorting screen – tap-based, no DnD
  if (isMobileLayout) {
    return (
      <MobileSortingView
        {...sharedProps}
        cards={cards}
        availableCards={availableCards}
        allCategories={allCategories}
        customCategories={customCategories}
        placedCards={placedCards}
        setPlacedCards={setPlacedCards}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        showNewCategoryForm={showNewCategoryForm}
        setShowNewCategoryForm={setShowNewCategoryForm}
        handleCreateCategory={handleCreateCategory}
        onCreateCategoryWithName={createCategoryWithName}
        editingCategoryId={editingCategoryId}
        editingCategoryName={editingCategoryName}
        setEditingCategoryName={setEditingCategoryName}
        handleStartEditCategory={handleStartEditCategory}
        handleSaveEditCategory={handleSaveEditCategory}
        handleCancelEditCategory={handleCancelEditCategory}
        handleDeleteCategory={handleDeleteCategory}
      />
    )
  }

  // Desktop sorting screen (DnD)
  return (
    <DesktopSortingView
      {...sharedProps}
      cards={cards}
      availableCards={availableCards}
      activeId={activeId}
      activeCard={activeCard}
      allCategories={allCategories}
      customCategories={customCategories}
      canCreateCategory={canCreateCategory}
      hoveredCategoryId={hoveredCategoryId}
      collapsedCategories={collapsedCategories}
      onToggleCollapse={toggleCategoryCollapsed}
      getCardsInCategory={getCardsInCategory}
      editingCategoryId={editingCategoryId}
      editingCategoryName={editingCategoryName}
      onStartEditCategory={handleStartEditCategory}
      onSaveEditCategory={handleSaveEditCategory}
      onCancelEditCategory={handleCancelEditCategory}
      onEditChange={setEditingCategoryName}
      onDeleteCategory={handleDeleteCategory}
      showNewCategoryForm={showNewCategoryForm}
      newCategoryName={newCategoryName}
      onSetShowNewCategoryForm={setShowNewCategoryForm}
      onSetNewCategoryName={setNewCategoryName}
      onCreateCategory={handleCreateCategory}
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    />
  )
}
