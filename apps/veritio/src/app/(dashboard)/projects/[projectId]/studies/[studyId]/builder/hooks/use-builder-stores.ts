'use client'

import { useCardSortBuilderStore, useTreeTestBuilderStore, usePrototypeTestBuilderStore, useFirstClickBuilderStore, useFirstImpressionBuilderStore, useLiveWebsiteBuilderStore, useCardSortIsDirty, useTreeTestIsDirty, usePrototypeTestIsDirty, useFirstClickIsDirty, useFirstImpressionIsDirty, useLiveWebsiteIsDirty } from '@/stores/study-builder'
import { useStudyFlowBuilderStore, useFlowIsDirty } from '@/stores/study-flow-builder'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import type { Study } from '@veritio/study-types'

/**
 * Centralized hook for accessing all builder-related stores and computed state.
 *
 * This hook consolidates store selectors for:
 * - Card Sort builder store
 * - Tree Test builder store
 * - Prototype Test builder store
 * - First-Click builder store
 * - Study Flow builder store
 * - Study Meta store (details, settings, branding)
 *
 * Note: A/B Tests use SWR with immediate saves, so they don't need dirty tracking.
 *
 * It also computes derived values like:
 * - Combined dirty state across all stores
 * - Combined save status
 * - Study type flags (isTreeTest, isSurvey, isPrototypeTest, isFirstClick)
 * - Hydration state
 */
export function useBuilderStores(study: Study | null) {
  // ============================================================================
  // Card Sort Store
  // ============================================================================
  const {
    cards,
    categories,
    settings: cardSortSettings,
    saveStatus: cardSortSaveStatus,
    lastSavedAt: cardSortLastSavedAt,
    studyId: storedCardSortStudyId,
    isHydrated: cardSortHydrated,
    loadFromApi: loadCardSortFromApi,
    markSaved: markCardSortSaved,
    setSaveStatus: setCardSortSaveStatus,
    reset: resetCardSort,
  } = useCardSortBuilderStore()

  const cardSortDirty = useCardSortIsDirty()

  // ============================================================================
  // Tree Test Store
  // ============================================================================
  const {
    nodes,
    tasks,
    settings: treeTestSettings,
    saveStatus: treeTestSaveStatus,
    lastSavedAt: treeTestLastSavedAt,
    studyId: storedTreeTestStudyId,
    isHydrated: treeTestHydrated,
    loadFromApi: loadTreeTestFromApi,
    markSaved: markTreeTestSaved,
    setSaveStatus: setTreeTestSaveStatus,
    reset: resetTreeTest,
  } = useTreeTestBuilderStore()

  const treeTestDirty = useTreeTestIsDirty()

  // ============================================================================
  // Prototype Test Store
  // ============================================================================
  const {
    prototype,
    frames: prototypeFrames,
    tasks: prototypeTasks,
    settings: prototypeTestSettings,
    saveStatus: prototypeTestSaveStatus,
    lastSavedAt: prototypeTestLastSavedAt,
    studyId: storedPrototypeTestStudyId,
    isHydrated: prototypeTestHydrated,
    loadFromApi: loadPrototypeTestFromApi,
    markSaved: markPrototypeTestSaved,
    setSaveStatus: setPrototypeTestSaveStatus,
    reset: resetPrototypeTest,
  } = usePrototypeTestBuilderStore()

  const prototypeTestDirty = usePrototypeTestIsDirty()

  // ============================================================================
  // First-Click Test Store
  // ============================================================================
  const {
    tasks: firstClickTasks,
    settings: firstClickSettings,
    saveStatus: firstClickSaveStatus,
    lastSavedAt: firstClickLastSavedAt,
    studyId: storedFirstClickStudyId,
    isHydrated: firstClickHydrated,
    loadFromApi: loadFirstClickFromApi,
    markSaved: markFirstClickSaved,
    setSaveStatus: setFirstClickSaveStatus,
    reset: resetFirstClick,
  } = useFirstClickBuilderStore()

  const firstClickDirty = useFirstClickIsDirty()

  // ============================================================================
  // First Impression Test Store
  // ============================================================================
  const {
    designs: firstImpressionDesigns,
    settings: firstImpressionSettings,
    saveStatus: firstImpressionSaveStatus,
    lastSavedAt: firstImpressionLastSavedAt,
    studyId: storedFirstImpressionStudyId,
    isHydrated: firstImpressionHydrated,
    loadFromApi: loadFirstImpressionFromApi,
    markSaved: markFirstImpressionSaved,
    setSaveStatus: setFirstImpressionSaveStatus,
    reset: resetFirstImpression,
  } = useFirstImpressionBuilderStore()

  const firstImpressionDirty = useFirstImpressionIsDirty()

  // ============================================================================
  // Live Website Test Store
  // ============================================================================
  const {
    tasks: liveWebsiteTasks,
    settings: liveWebsiteSettings,
    saveStatus: liveWebsiteSaveStatus,
    lastSavedAt: liveWebsiteLastSavedAt,
    studyId: storedLiveWebsiteStudyId,
    isHydrated: liveWebsiteHydrated,
    loadFromApi: loadLiveWebsiteFromApi,
    markSaved: markLiveWebsiteSaved,
    setSaveStatus: setLiveWebsiteSaveStatus,
    reset: resetLiveWebsite,
  } = useLiveWebsiteBuilderStore()

  const liveWebsiteDirty = useLiveWebsiteIsDirty()

  // ============================================================================
  // Study Flow Store
  // ============================================================================
  const {
    flowSettings,
    screeningQuestions,
    preStudyQuestions,
    postStudyQuestions,
    surveyQuestions,
    saveStatus: flowSaveStatus,
    lastSavedAt: flowLastSavedAt,
    studyId: storedFlowStudyId,
    loadFromApi: loadFlowFromApi,
    loadSettingsFromExternal,
    markSaved: markFlowSaved,
    setSaveStatus: setFlowSaveStatus,
    setHydrated: setFlowHydrated,
  } = useStudyFlowBuilderStore()

  const flowDirty = useFlowIsDirty()

  // ============================================================================
  // Study Meta Store
  // ============================================================================
  const {
    loadFromStudy: loadMetaFromStudy,
    studyId: storedMetaStudyId,
    isHydrated: metaHydrated,
  } = useStudyMetaStore()

  // ============================================================================
  // Study Type Flags
  // ============================================================================
  const isTreeTest = study?.study_type === 'tree_test'
  const isSurvey = study?.study_type === 'survey'
  const isPrototypeTest = study?.study_type === 'prototype_test'
  const isFirstClick = study?.study_type === 'first_click'
  const isFirstImpression = study?.study_type === 'first_impression'
  const isCardSort = study?.study_type === 'card_sort'
  const isLiveWebsiteTest = study?.study_type === 'live_website_test'

  // ============================================================================
  // Computed Dirty State
  // ============================================================================
  // For survey, there's no content store - only flow questions
  const getContentDirty = () => {
    if (isSurvey) return false
    if (isTreeTest) return treeTestDirty
    if (isPrototypeTest) return prototypeTestDirty
    if (isFirstClick) return firstClickDirty
    if (isFirstImpression) return firstImpressionDirty
    if (isLiveWebsiteTest) return liveWebsiteDirty
    return cardSortDirty
  }
  const contentDirty = getContentDirty()
  // Note: A/B tests use SWR with immediate saves, no dirty tracking needed
  const combinedDirty = contentDirty || flowDirty

  // ============================================================================
  // Computed Save Status
  // ============================================================================
  const getContentSaveStatus = () => {
    if (isSurvey) return 'idle' as const
    if (isTreeTest) return treeTestSaveStatus
    if (isPrototypeTest) return prototypeTestSaveStatus
    if (isFirstClick) return firstClickSaveStatus
    if (isFirstImpression) return firstImpressionSaveStatus
    if (isLiveWebsiteTest) return liveWebsiteSaveStatus
    return cardSortSaveStatus
  }
  const contentSaveStatus = getContentSaveStatus()
  const combinedSaveStatus = isSurvey
    ? flowSaveStatus
    : (contentSaveStatus === 'saving' || flowSaveStatus === 'saving' ? 'saving' : contentSaveStatus)

  // ============================================================================
  // Computed Last Saved At
  // ============================================================================
  const getLastSavedAt = () => {
    if (isSurvey) return flowLastSavedAt
    if (isTreeTest) return treeTestLastSavedAt
    if (isPrototypeTest) return prototypeTestLastSavedAt
    if (isFirstClick) return firstClickLastSavedAt
    if (isFirstImpression) return firstImpressionLastSavedAt
    if (isLiveWebsiteTest) return liveWebsiteLastSavedAt
    return cardSortLastSavedAt
  }
  const lastSavedAt = getLastSavedAt()

  // ============================================================================
  // Hydration State
  // ============================================================================
  // Must wait for meta store AND content store
  // Meta store holds branding (logo size, colors) which must be loaded from API, not stale localStorage
  const getContentStoreHydrated = () => {
    if (isSurvey) return true
    if (isTreeTest) return treeTestHydrated
    if (isPrototypeTest) return prototypeTestHydrated
    if (isFirstClick) return firstClickHydrated
    if (isFirstImpression) return firstImpressionHydrated
    if (isLiveWebsiteTest) return liveWebsiteHydrated
    return cardSortHydrated
  }
  const contentStoreHydrated = getContentStoreHydrated()
  const isStoreHydrated = contentStoreHydrated && metaHydrated

  // Update content store settings from AI payload without full API refetch
  const loadContentSettingsFromPayload = (contentSettings: Record<string, any>, studyId: string) => {
    if (isCardSort) {
      loadCardSortFromApi({ cards, categories, settings: contentSettings as any, studyId })
    } else if (isTreeTest) {
      loadTreeTestFromApi({ nodes, tasks, settings: contentSettings as any, studyId })
    } else if (isPrototypeTest) {
      loadPrototypeTestFromApi({ prototype, frames: prototypeFrames, tasks: prototypeTasks, settings: contentSettings as any, studyId })
    } else if (isFirstClick) {
      loadFirstClickFromApi({ tasks: firstClickTasks, settings: contentSettings as any, studyId })
    } else if (isFirstImpression) {
      loadFirstImpressionFromApi({ designs: firstImpressionDesigns, settings: contentSettings as any, studyId })
    } else if (isLiveWebsiteTest) {
      loadLiveWebsiteFromApi({ tasks: liveWebsiteTasks, settings: contentSettings as any, variants: [], taskVariants: [], selectedVariantId: null, studyId })
    }
  }

  return {
    // Study type flags
    isTreeTest,
    isSurvey,
    isPrototypeTest,
    isFirstClick,
    isFirstImpression,
    isCardSort,
    isLiveWebsiteTest,

    // Card Sort store values
    cards,
    categories,
    cardSortSettings,
    cardSortSaveStatus,
    cardSortLastSavedAt,
    storedCardSortStudyId,
    cardSortHydrated,
    loadCardSortFromApi,
    markCardSortSaved,
    setCardSortSaveStatus,
    resetCardSort,
    cardSortDirty,

    // Tree Test store values
    nodes,
    tasks,
    treeTestSettings,
    treeTestSaveStatus,
    treeTestLastSavedAt,
    storedTreeTestStudyId,
    treeTestHydrated,
    loadTreeTestFromApi,
    markTreeTestSaved,
    setTreeTestSaveStatus,
    resetTreeTest,
    treeTestDirty,

    // Prototype Test store values
    prototype,
    prototypeFrames,
    prototypeTasks,
    prototypeTestSettings,
    prototypeTestSaveStatus,
    prototypeTestLastSavedAt,
    storedPrototypeTestStudyId,
    prototypeTestHydrated,
    loadPrototypeTestFromApi,
    markPrototypeTestSaved,
    setPrototypeTestSaveStatus,
    resetPrototypeTest,
    prototypeTestDirty,

    // First-Click Test store values
    firstClickTasks,
    firstClickSettings,
    firstClickSaveStatus,
    firstClickLastSavedAt,
    storedFirstClickStudyId,
    firstClickHydrated,
    loadFirstClickFromApi,
    markFirstClickSaved,
    setFirstClickSaveStatus,
    resetFirstClick,
    firstClickDirty,

    // First Impression Test store values
    firstImpressionDesigns,
    firstImpressionSettings,
    firstImpressionSaveStatus,
    firstImpressionLastSavedAt,
    storedFirstImpressionStudyId,
    firstImpressionHydrated,
    loadFirstImpressionFromApi,
    markFirstImpressionSaved,
    setFirstImpressionSaveStatus,
    resetFirstImpression,
    firstImpressionDirty,

    // Live Website Test store values
    liveWebsiteTasks,
    liveWebsiteSettings,
    liveWebsiteSaveStatus,
    liveWebsiteLastSavedAt,
    storedLiveWebsiteStudyId,
    liveWebsiteHydrated,
    loadLiveWebsiteFromApi,
    markLiveWebsiteSaved,
    setLiveWebsiteSaveStatus,
    resetLiveWebsite,
    liveWebsiteDirty,

    // Flow store values
    flowSettings,
    screeningQuestions,
    preStudyQuestions,
    postStudyQuestions,
    surveyQuestions,
    flowSaveStatus,
    flowLastSavedAt,
    storedFlowStudyId,
    loadFlowFromApi,
    loadSettingsFromExternal,
    markFlowSaved,
    setFlowSaveStatus,
    setFlowHydrated,
    flowDirty,

    // Meta store values
    loadMetaFromStudy,
    storedMetaStudyId,
    metaHydrated,

    // AI content settings update
    loadContentSettingsFromPayload,

    // Computed values
    contentDirty,
    combinedDirty,
    contentSaveStatus,
    combinedSaveStatus,
    lastSavedAt,
    isStoreHydrated,
  }
}

export type BuilderStores = ReturnType<typeof useBuilderStores>
