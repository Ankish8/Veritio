'use client'
import { useEffect, useRef, useCallback } from 'react'
import * as Y from 'yjs'
import { useStudyMetaStore } from '../stores/study-meta-store'

/**
 * Yjs ↔ Zustand sync for the study meta store (Settings, Branding, Sharing tabs).
 *
 * Syncs non-text meta fields via a Y.Map('studyMeta'). Text fields (title,
 * description, purpose, participantRequirements) are handled by collaborative
 * editors using Y.Text directly.
 *
 * Follows the same bi-directional sync pattern as useYjsTreeSync:
 * - Transaction origin tracking to prevent ping-pong loops
 * - Content-based comparison to avoid writing identical data
 * - queueMicrotask guard for Yjs→Zustand sync direction
 */

// Fields to sync via Yjs. Excludes title/description/purpose/participantRequirements
// (synced via Y.Text in collaborative editors) and read-only metadata
// (status, createdAt, updatedAt, launchedAt, participantCount).
const SYNC_FIELDS = [
  'language',
  'password',
  'urlSlug',
  'sessionRecordingSettings',
  'closingRule',
  'responsePrevention',
  'notificationSettings',
  'branding',
  'sharingSettings',
  'folderId',
  'fileAttachments',
] as const

type SyncField = (typeof SYNC_FIELDS)[number]

const ORIGIN_LOCAL = 'local-meta-sync'

// --- Helpers ---

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return a === b
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, (b as unknown[])[i]))
  }

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]))
}

interface UseYjsMetaSyncOptions {
  doc: Y.Doc | null
  isSynced: boolean
  enabled?: boolean
}

export function useYjsMetaSync({
  doc,
  isSynced,
  enabled = true,
}: UseYjsMetaSyncOptions): void {
  const isReadyRef = useRef(false)
  const isSyncingFromYjsRef = useRef(false)
  const isSyncingToYjsRef = useRef(false)

  const store = useStudyMetaStore

  const getYjsMap = useCallback(() => {
    if (!doc) return null
    return doc.getMap<unknown>('studyMeta')
  }, [doc])

  // Sync Zustand → Yjs
  const syncToYjs = useCallback(() => {
    if (!doc || isSyncingToYjsRef.current || isSyncingFromYjsRef.current) return
    const ymap = getYjsMap()
    if (!ymap) return

    isSyncingToYjsRef.current = true
    doc.transact(() => {
      const meta = store.getState().meta as unknown as Record<string, unknown>
      for (const field of SYNC_FIELDS) {
        const value = meta[field]
        if (value !== undefined) {
          ymap.set(field, value)
        }
      }
    }, ORIGIN_LOCAL)
    isSyncingToYjsRef.current = false
  }, [doc, getYjsMap, store])

  // Sync Yjs → Zustand
  const syncToZustand = useCallback(() => {
    if (!doc || isSyncingFromYjsRef.current || isSyncingToYjsRef.current) return
    const ymap = getYjsMap()
    if (!ymap) return

    isSyncingFromYjsRef.current = true

    const state = store.getState()
    const currentMeta = state.meta as unknown as Record<string, unknown>

    for (const field of SYNC_FIELDS) {
      const yjsValue = ymap.get(field)
      if (yjsValue !== undefined && !deepEqual(yjsValue, currentMeta[field])) {
        // Use the appropriate setter for each field
        switch (field) {
          case 'language':
            state.setLanguage(yjsValue as string)
            break
          case 'password':
            state.setPassword(yjsValue as string | null)
            break
          case 'urlSlug':
            state.setUrlSlug(yjsValue as string | null)
            break
          case 'sessionRecordingSettings':
            state.setSessionRecordingSettings(yjsValue as Parameters<typeof state.setSessionRecordingSettings>[0])
            break
          case 'closingRule':
            state.setClosingRule(yjsValue as Parameters<typeof state.setClosingRule>[0])
            break
          case 'responsePrevention':
            state.setResponsePrevention(yjsValue as Parameters<typeof state.setResponsePrevention>[0])
            break
          case 'notificationSettings':
            state.setNotificationSettings(yjsValue as Parameters<typeof state.setNotificationSettings>[0])
            break
          case 'branding':
            state.setBranding(yjsValue as Parameters<typeof state.setBranding>[0])
            break
          case 'sharingSettings':
            state.setSharingSettings(yjsValue as Parameters<typeof state.setSharingSettings>[0])
            break
          case 'folderId':
            state.setFolderId(yjsValue as string | null)
            break
          case 'fileAttachments':
            state.setFileAttachments(yjsValue as Parameters<typeof state.setFileAttachments>[0])
            break
        }
      }
    }

    // Keep the flag set through the current microtask to block any
    // synchronous Zustand subscription callbacks from writing back to Yjs
    queueMicrotask(() => {
      isSyncingFromYjsRef.current = false
    })
  }, [doc, getYjsMap, store])

  // Initialize: Load Zustand data into Yjs (if Yjs is empty) or vice versa
  useEffect(() => {
    if (!doc || !isSynced || !enabled || isReadyRef.current) return
    const ymap = getYjsMap()
    if (!ymap) return

    const yjsIsEmpty = ymap.size === 0
    const state = store.getState()
    const hasLocalData = state.studyId !== null

    if (yjsIsEmpty && hasLocalData) {
      // First user — push local data to Yjs
      syncToYjs()
    } else if (!yjsIsEmpty) {
      // Yjs has data — sync to local store
      syncToZustand()
    }

    isReadyRef.current = true
  }, [doc, isSynced, enabled, getYjsMap, syncToYjs, syncToZustand, store])

  // Yjs observers → Zustand (remote changes)
  useEffect(() => {
    if (!doc || !enabled || !isSynced || !isReadyRef.current) return
    const ymap = getYjsMap()
    if (!ymap) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleChange = (_events: any[], transaction: Y.Transaction) => {
      // Skip changes we made ourselves
      if (transaction.origin === ORIGIN_LOCAL) return
      if (isSyncingToYjsRef.current) return
      syncToZustand()
    }

    ymap.observeDeep(handleChange)
    return () => {
      ymap.unobserveDeep(handleChange)
    }
  }, [doc, enabled, isSynced, getYjsMap, syncToZustand])

  // Zustand subscription → Yjs (local changes)
  useEffect(() => {
    if (!doc || !enabled || !isSynced || !isReadyRef.current) return

    const unsubscribe = store.subscribe((state, prevState) => {
      // Skip if syncing in either direction
      if (isSyncingFromYjsRef.current) return
      if (isSyncingToYjsRef.current) return

      // Quick reference check
      if (state.meta === prevState.meta) return

      const ymap = getYjsMap()
      if (!ymap) return

      // Check which fields actually changed and differ from Yjs
      const meta = state.meta as unknown as Record<string, unknown>
      const prevMeta = prevState.meta as unknown as Record<string, unknown>
      const changedFields: SyncField[] = []

      for (const field of SYNC_FIELDS) {
        if (meta[field] !== prevMeta[field]) {
          // Deep check against Yjs to avoid writing back identical data
          const yjsValue = ymap.get(field)
          if (!deepEqual(meta[field], yjsValue)) {
            changedFields.push(field)
          }
        }
      }

      if (changedFields.length === 0) return

      isSyncingToYjsRef.current = true
      doc.transact(() => {
        for (const field of changedFields) {
          const value = meta[field]
          if (value !== undefined) {
            ymap.set(field, value)
          } else {
            ymap.delete(field)
          }
        }
      }, ORIGIN_LOCAL)
      isSyncingToYjsRef.current = false
    })

    return () => {
      unsubscribe()
    }
  }, [doc, enabled, isSynced, getYjsMap, store])
}
