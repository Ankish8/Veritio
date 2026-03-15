'use client'
import { useEffect, useRef, useCallback } from 'react'
import * as Y from 'yjs'
import type { StudyFlowSettings, StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { createSnapshot } from '@veritio/prototype-test/lib/utils/deep-equal'
import {
  useStudyFlowBuilderStore,
  useFlowSettings,
  useScreeningQuestions,
  usePreStudyQuestions,
  usePostStudyQuestions,
  useSurveyQuestions,
} from '@veritio/prototype-test/stores/study-flow-builder'

interface UseYjsFlowSyncOptions {
  doc: Y.Doc | null
  isSynced: boolean
  enabled?: boolean
}

interface UseYjsFlowSyncReturn {
  isReady: boolean
  syncToYjs: () => void
  syncToZustand: () => void
}
function ymapToObject<T>(ymap: Y.Map<unknown>): T {
  const obj: Record<string, unknown> = {}
  ymap.forEach((value, key) => {
    if (value instanceof Y.Map) {
      obj[key] = ymapToObject(value)
    } else if (value instanceof Y.Array) {
      obj[key] = yarrayToPlainArray(value)
    } else {
      obj[key] = value
    }
  })
  return obj as T
}
function yarrayToPlainArray(yarray: Y.Array<unknown>): unknown[] {
  const items: unknown[] = []
  yarray.forEach((item) => {
    if (item instanceof Y.Map) {
      items.push(ymapToObject(item))
    } else if (item instanceof Y.Array) {
      items.push(yarrayToPlainArray(item))
    } else {
      items.push(item)
    }
  })
  return items
}
function yarrayToArray<T>(yarray: Y.Array<Y.Map<unknown>>): T[] {
  const items: T[] = []
  yarray.forEach((ymap) => {
    items.push(ymapToObject<T>(ymap))
  })
  return items
}
function setYArrayFromArray<T extends object>(
  yarray: Y.Array<Y.Map<unknown>>,
  items: T[]
) {
  // Only clear if already in a document (prevents "Invalid access" warning)
  if (yarray.doc) {
    yarray.delete(0, yarray.length)
  }
  items.forEach((item) => {
    const ymap = new Y.Map<unknown>()
    setYMapFromObjectDeep(ymap, item as unknown as Record<string, unknown>)
    yarray.push([ymap])
  })
}
function setYMapFromObjectDeep(ymap: Y.Map<unknown>, obj: Record<string, unknown>) {
  // Only clear existing keys if already in a document (prevents "Invalid access" warning)
  if (ymap.doc) {
    const existingKeys = Array.from(ymap.keys())
    existingKeys.forEach((key) => ymap.delete(key))
  }

  // Set new values
  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined) return

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Nested object → Y.Map
      const nestedMap = new Y.Map<unknown>()
      setYMapFromObjectDeep(nestedMap, value as Record<string, unknown>)
      ymap.set(key, nestedMap)
    } else if (Array.isArray(value)) {
      // Array → Y.Array
      const nestedArray = new Y.Array<unknown>()
      value.forEach((item) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          const itemMap = new Y.Map<unknown>()
          setYMapFromObjectDeep(itemMap, item as Record<string, unknown>)
          nestedArray.push([itemMap])
        } else {
          nestedArray.push([item])
        }
      })
      ymap.set(key, nestedArray)
    } else {
      // Primitive value
      ymap.set(key, value)
    }
  })
}
function setYMapFromObject(ymap: Y.Map<unknown>, obj: Record<string, unknown>) {
  // Only clear existing keys if already in a document (prevents "Invalid access" warning)
  if (ymap.doc) {
    const existingKeys = Array.from(ymap.keys())
    existingKeys.forEach((key) => ymap.delete(key))
  }

  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) {
      // For complex nested objects, serialize to JSON string to preserve structure
      if (value !== null && typeof value === 'object') {
        ymap.set(key, JSON.stringify(value))
      } else {
        ymap.set(key, value)
      }
    }
  })
}
function ymapToObjectWithJsonParse<T>(ymap: Y.Map<unknown>): T {
  const obj: Record<string, unknown> = {}
  ymap.forEach((value, key) => {
    if (typeof value === 'string') {
      // Try to parse as JSON (for nested objects)
      try {
        const parsed = JSON.parse(value)
        if (typeof parsed === 'object' && parsed !== null) {
          obj[key] = parsed
        } else {
          obj[key] = value
        }
      } catch {
        obj[key] = value
      }
    } else {
      obj[key] = value
    }
  })
  return obj as T
}

export function useYjsFlowSync({
  doc,
  isSynced,
  enabled = true,
}: UseYjsFlowSyncOptions): UseYjsFlowSyncReturn {
  const isReadyRef = useRef(false)
  const isSyncingRef = useRef(false)

  // Get Zustand data
  const zustandFlowSettings = useFlowSettings()
  const zustandScreeningQuestions = useScreeningQuestions()
  const zustandPreStudyQuestions = usePreStudyQuestions()
  const zustandPostStudyQuestions = usePostStudyQuestions()
  const zustandSurveyQuestions = useSurveyQuestions()
  const zustandStore = useStudyFlowBuilderStore

  // Get Yjs structures
  const getYjsStructures = useCallback(() => {
    if (!doc) return null
    return {
      flowSettings: doc.getMap('flowSettings'),
      screeningQuestions: doc.getArray<Y.Map<unknown>>('screeningQuestions'),
      preStudyQuestions: doc.getArray<Y.Map<unknown>>('preStudyQuestions'),
      postStudyQuestions: doc.getArray<Y.Map<unknown>>('postStudyQuestions'),
      surveyQuestions: doc.getArray<Y.Map<unknown>>('surveyQuestions'),
    }
  }, [doc])

  // Sync Zustand → Yjs
  const syncToYjs = useCallback(() => {
    if (!doc || isSyncingRef.current) return

    const yjs = getYjsStructures()
    if (!yjs) return

    isSyncingRef.current = true
    doc.transact(() => {
      const state = zustandStore.getState()

      // Sync flow settings (use JSON serialization for complex nested structure)
      setYMapFromObject(yjs.flowSettings, state.flowSettings as unknown as Record<string, unknown>)

      // Sync question arrays
      setYArrayFromArray(yjs.screeningQuestions, state.screeningQuestions)
      setYArrayFromArray(yjs.preStudyQuestions, state.preStudyQuestions)
      setYArrayFromArray(yjs.postStudyQuestions, state.postStudyQuestions)
      setYArrayFromArray(yjs.surveyQuestions, state.surveyQuestions)
    })
    isSyncingRef.current = false
  }, [doc, getYjsStructures, zustandStore])

  // Sync Yjs → Zustand (for receiving remote changes)
  const syncToZustand = useCallback(() => {
    if (!doc || isSyncingRef.current) return

    const yjs = getYjsStructures()
    if (!yjs) return

    isSyncingRef.current = true

    // Helper to deduplicate questions by ID (keep first occurrence)
    const dedupeQuestions = (questions: StudyFlowQuestion[]): StudyFlowQuestion[] => {
      const seen = new Set<string>()
      return questions.filter((q) => {
        if (seen.has(q.id)) return false
        seen.add(q.id)
        return true
      })
    }

    // Parse flow settings (with JSON parsing for nested objects)
    const flowSettings = ymapToObjectWithJsonParse<StudyFlowSettings>(yjs.flowSettings)
    // Deduplicate questions to prevent React key errors
    const screeningQuestions = dedupeQuestions(yarrayToArray<StudyFlowQuestion>(yjs.screeningQuestions))
    const preStudyQuestions = dedupeQuestions(yarrayToArray<StudyFlowQuestion>(yjs.preStudyQuestions))
    const postStudyQuestions = dedupeQuestions(yarrayToArray<StudyFlowQuestion>(yjs.postStudyQuestions))
    const surveyQuestions = dedupeQuestions(yarrayToArray<StudyFlowQuestion>(yjs.surveyQuestions))

    const state = zustandStore.getState()

    // Check what changed
    const flowSettingsChanged = Object.keys(flowSettings).length > 0 && JSON.stringify(flowSettings) !== JSON.stringify(state.flowSettings)
    const screeningChanged = JSON.stringify(screeningQuestions) !== JSON.stringify(state.screeningQuestions)
    const preStudyChanged = JSON.stringify(preStudyQuestions) !== JSON.stringify(state.preStudyQuestions)
    const postStudyChanged = JSON.stringify(postStudyQuestions) !== JSON.stringify(state.postStudyQuestions)
    const surveyChanged = JSON.stringify(surveyQuestions) !== JSON.stringify(state.surveyQuestions)

    const hasChanges = flowSettingsChanged || screeningChanged || preStudyChanged || postStudyChanged || surveyChanged

    if (hasChanges) {
      // CRITICAL: Atomic update of both data AND snapshot in a single setState call.
      // This prevents the auto-save from seeing a "dirty" state transition, which would
      // cause "Save failed" errors for collaborators who don't have save permissions.
      // By updating data and snapshot together, the store is NEVER dirty from remote changes.

      // IMPORTANT: Must update ALL data fields together with snapshot to maintain consistency
      // If we only update changed fields, the snapshot won't match the state, making it dirty
      const newData = {
        flowSettings: flowSettingsChanged ? flowSettings : state.flowSettings,
        screeningQuestions: screeningChanged ? screeningQuestions : state.screeningQuestions,
        preStudyQuestions: preStudyChanged ? preStudyQuestions : state.preStudyQuestions,
        postStudyQuestions: postStudyChanged ? postStudyQuestions : state.postStudyQuestions,
        surveyQuestions: surveyChanged ? surveyQuestions : state.surveyQuestions,
      }

      // Create snapshot from the new data so they're always equal (never dirty)
      const newSnapshot = createSnapshot(newData)

      // Single atomic setState - ALL data fields + snapshot together
      // This ensures snapshot and state are always in sync
      zustandStore.setState({
        ...newData,
        _snapshot: newSnapshot,
      })
    }

    isSyncingRef.current = false
  }, [doc, getYjsStructures, zustandStore])

  // Initialize: Load Zustand data into Yjs (if Yjs is empty)
  useEffect(() => {
    if (!doc || !isSynced || !enabled || isReadyRef.current) return

    const yjs = getYjsStructures()
    if (!yjs) return

    // Check if Yjs is empty (first user to connect)
    const yjsIsEmpty =
      yjs.flowSettings.size === 0 &&
      yjs.screeningQuestions.length === 0 &&
      yjs.preStudyQuestions.length === 0 &&
      yjs.postStudyQuestions.length === 0 &&
      yjs.surveyQuestions.length === 0

    const zustandHasData =
      Object.keys(zustandFlowSettings).length > 0 ||
      zustandScreeningQuestions.length > 0 ||
      zustandPreStudyQuestions.length > 0 ||
      zustandPostStudyQuestions.length > 0 ||
      zustandSurveyQuestions.length > 0

    if (yjsIsEmpty && zustandHasData) {
      // First collaborator: Initialize Yjs from Zustand
      syncToYjs()
    } else if (!yjsIsEmpty) {
      // Joining collaborator: Sync Yjs to Zustand
      syncToZustand()
    }

    isReadyRef.current = true
  }, [
    doc,
    isSynced,
    enabled,
    getYjsStructures,
    syncToYjs,
    syncToZustand,
    zustandFlowSettings,
    zustandScreeningQuestions.length,
    zustandPreStudyQuestions.length,
    zustandPostStudyQuestions.length,
    zustandSurveyQuestions.length,
  ])

  // Set up Yjs observers to sync changes to Zustand
  useEffect(() => {
    if (!doc || !enabled || !isReadyRef.current) return

    const yjs = getYjsStructures()
    if (!yjs) return

    const handleYjsChange = () => {
      if (!isSyncingRef.current) {
        syncToZustand()
      }
    }

    // Observe all structures
    yjs.flowSettings.observe(handleYjsChange)
    yjs.screeningQuestions.observe(handleYjsChange)
    yjs.preStudyQuestions.observe(handleYjsChange)
    yjs.postStudyQuestions.observe(handleYjsChange)
    yjs.surveyQuestions.observe(handleYjsChange)

    // Also observe deep changes on array items
    const questionMapObservers: (() => void)[] = []

    const setupMapObservers = () => {
      // Clear old observers
      questionMapObservers.forEach((fn) => fn())
      questionMapObservers.length = 0

      // Setup observers on each question Y.Map
      const allArrays = [
        yjs.screeningQuestions,
        yjs.preStudyQuestions,
        yjs.postStudyQuestions,
        yjs.surveyQuestions,
      ]

      allArrays.forEach((yarray) => {
        yarray.forEach((ymap) => {
          const unobserve = () => ymap.unobserve(handleYjsChange)
          ymap.observe(handleYjsChange)
          questionMapObservers.push(unobserve)
        })
      })
    }

    setupMapObservers()

    // Re-setup when arrays change
    const arrayChangeHandler = () => setupMapObservers()
    yjs.screeningQuestions.observe(arrayChangeHandler)
    yjs.preStudyQuestions.observe(arrayChangeHandler)
    yjs.postStudyQuestions.observe(arrayChangeHandler)
    yjs.surveyQuestions.observe(arrayChangeHandler)

    return () => {
      yjs.flowSettings.unobserve(handleYjsChange)
      yjs.screeningQuestions.unobserve(handleYjsChange)
      yjs.screeningQuestions.unobserve(arrayChangeHandler)
      yjs.preStudyQuestions.unobserve(handleYjsChange)
      yjs.preStudyQuestions.unobserve(arrayChangeHandler)
      yjs.postStudyQuestions.unobserve(handleYjsChange)
      yjs.postStudyQuestions.unobserve(arrayChangeHandler)
      yjs.surveyQuestions.unobserve(handleYjsChange)
      yjs.surveyQuestions.unobserve(arrayChangeHandler)
      questionMapObservers.forEach((fn) => fn())
    }
  }, [doc, enabled, getYjsStructures, syncToZustand])

  // Set up Zustand subscription to sync local changes to Yjs
  useEffect(() => {
    if (!doc || !enabled || !isReadyRef.current) return

    // Subscribe to Zustand store changes
    const unsubscribe = zustandStore.subscribe((state, prevState) => {
      // Skip if we're already syncing (prevents loops)
      if (isSyncingRef.current) return

      // Check what changed
      const flowSettingsChanged = state.flowSettings !== prevState.flowSettings
      const screeningChanged = state.screeningQuestions !== prevState.screeningQuestions
      const preStudyChanged = state.preStudyQuestions !== prevState.preStudyQuestions
      const postStudyChanged = state.postStudyQuestions !== prevState.postStudyQuestions
      const surveyChanged = state.surveyQuestions !== prevState.surveyQuestions

      if (!flowSettingsChanged && !screeningChanged && !preStudyChanged && !postStudyChanged && !surveyChanged) {
        return
      }

      // Sync changed data to Yjs
      const yjs = getYjsStructures()
      if (!yjs) return

      isSyncingRef.current = true
      doc.transact(() => {
        if (flowSettingsChanged) {
          setYMapFromObject(yjs.flowSettings, state.flowSettings as unknown as Record<string, unknown>)
        }
        if (screeningChanged) {
          setYArrayFromArray(yjs.screeningQuestions, state.screeningQuestions)
        }
        if (preStudyChanged) {
          setYArrayFromArray(yjs.preStudyQuestions, state.preStudyQuestions)
        }
        if (postStudyChanged) {
          setYArrayFromArray(yjs.postStudyQuestions, state.postStudyQuestions)
        }
        if (surveyChanged) {
          setYArrayFromArray(yjs.surveyQuestions, state.surveyQuestions)
        }
      })
      isSyncingRef.current = false
    })

    return () => {
      unsubscribe()
    }
  }, [doc, enabled, getYjsStructures, zustandStore])

  return {
    isReady: isReadyRef.current,
    syncToYjs,
    syncToZustand,
  }
}
