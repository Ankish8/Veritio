'use client'
import { useEffect, useRef, useCallback } from 'react'
import * as Y from 'yjs'
import type { TreeNode, Task, TreeTestSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import {
  useTreeTestBuilderStore,
  useTreeTestNodes,
  useTreeTestTasks,
  useTreeTestSettings,
} from '../stores'

interface UseYjsTreeSyncOptions {
  doc: Y.Doc | null
  isSynced: boolean
  enabled?: boolean
}

interface UseYjsTreeSyncReturn {
  isReady: boolean
  syncToYjs: () => void
  syncToZustand: () => void
}

// --- Helpers ---

function ymapToObject<T>(ymap: Y.Map<unknown>): T {
  const obj: Record<string, unknown> = {}
  ymap.forEach((value, key) => {
    obj[key] = value
  })
  return obj as T
}

function yarrayToArray<T>(yarray: Y.Array<Y.Map<unknown>>): T[] {
  const items: T[] = []
  yarray.forEach((ymap) => {
    items.push(ymapToObject<T>(ymap))
  })
  return items
}

function setYArrayFromArray<T extends Record<string, unknown>>(
  yarray: Y.Array<Y.Map<unknown>>,
  items: T[]
) {
  yarray.delete(0, yarray.length)
  items.forEach((item) => {
    const ymap = new Y.Map<unknown>()
    Object.entries(item).forEach(([key, value]) => {
      if (value !== undefined) {
        ymap.set(key, value)
      }
    })
    yarray.push([ymap])
  })
}

function setYMapFromObject(ymap: Y.Map<unknown>, obj: Record<string, unknown>) {
  const existingKeys = Array.from(ymap.keys())
  existingKeys.forEach((key) => ymap.delete(key))
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) {
      ymap.set(key, value)
    }
  })
}

/**
 * Content-based comparison for node arrays.
 * Compares by id, label, parent_id, position, and path — the fields that matter.
 * Avoids JSON.stringify which fails on key ordering differences between
 * plain objects and Y.Map-derived objects.
 */
function nodesAreEqual(a: TreeNode[], b: TreeNode[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].label !== b[i].label ||
      a[i].parent_id !== b[i].parent_id ||
      a[i].position !== b[i].position ||
      a[i].path !== b[i].path
    ) {
      return false
    }
  }
  return true
}

function tasksAreEqual(a: Task[], b: Task[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].question !== b[i].question ||
      a[i].correct_node_id !== b[i].correct_node_id ||
      a[i].position !== b[i].position ||
      JSON.stringify(a[i].correct_node_ids) !== JSON.stringify(b[i].correct_node_ids) ||
      JSON.stringify(a[i].post_task_questions) !== JSON.stringify(b[i].post_task_questions)
    ) {
      return false
    }
  }
  return true
}

function settingsAreEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => a[key] === b[key])
}

// --- Transaction origin markers ---
// Used with doc.transact(fn, origin) so Yjs observers can distinguish
// local writes from remote writes, preventing the ping-pong loop.
const ORIGIN_LOCAL = 'local-zustand-sync'

export function useYjsTreeSync({
  doc,
  isSynced,
  enabled = true,
}: UseYjsTreeSyncOptions): UseYjsTreeSyncReturn {
  const isReadyRef = useRef(false)
  const isSyncingFromYjsRef = useRef(false)
  const isSyncingToYjsRef = useRef(false)

  // Get Zustand data
  const zustandNodes = useTreeTestNodes()
  const zustandTasks = useTreeTestTasks()
  const zustandSettings = useTreeTestSettings()
  const zustandStore = useTreeTestBuilderStore

  // Get Yjs structures
  const getYjsStructures = useCallback(() => {
    if (!doc) return null
    return {
      nodes: doc.getArray<Y.Map<unknown>>('treeNodes'),
      tasks: doc.getArray<Y.Map<unknown>>('tasks'),
      settings: doc.getMap('treeSettings'),
    }
  }, [doc])

  // Sync Zustand → Yjs (used for initialization)
  const syncToYjs = useCallback(() => {
    if (!doc || isSyncingToYjsRef.current || isSyncingFromYjsRef.current) return

    const yjs = getYjsStructures()
    if (!yjs) return

    isSyncingToYjsRef.current = true
    doc.transact(() => {
      const state = zustandStore.getState()
      setYArrayFromArray(yjs.nodes, state.nodes)
      setYArrayFromArray(yjs.tasks, state.tasks)
      setYMapFromObject(yjs.settings, state.settings)
    }, ORIGIN_LOCAL)
    isSyncingToYjsRef.current = false
  }, [doc, getYjsStructures, zustandStore])

  // Sync Yjs → Zustand (used when receiving remote updates)
  const syncToZustand = useCallback(() => {
    if (!doc || isSyncingFromYjsRef.current || isSyncingToYjsRef.current) return

    const yjs = getYjsStructures()
    if (!yjs) return

    isSyncingFromYjsRef.current = true

    // Deduplicate by id — Yjs CRDT merges can produce duplicates
    // when two clients concurrently delete-all-then-insert-all on a Y.Array
    const rawNodes = yarrayToArray<TreeNode>(yjs.nodes)
    const seenNodes = new Set<string>()
    const nodes = rawNodes.filter((n) => {
      if (seenNodes.has(n.id)) return false
      seenNodes.add(n.id)
      return true
    })

    const rawTasks = yarrayToArray<Task>(yjs.tasks)
    const seenTasks = new Set<string>()
    const tasks = rawTasks.filter((t) => {
      if (seenTasks.has(t.id)) return false
      seenTasks.add(t.id)
      return true
    })

    // If duplicates were found, clean up the Yjs document
    if (nodes.length < rawNodes.length || tasks.length < rawTasks.length) {
      isSyncingToYjsRef.current = true
      doc.transact(() => {
        if (nodes.length < rawNodes.length) {
          setYArrayFromArray(yjs.nodes, nodes)
        }
        if (tasks.length < rawTasks.length) {
          setYArrayFromArray(yjs.tasks, tasks)
        }
      }, ORIGIN_LOCAL)
      isSyncingToYjsRef.current = false
    }
    const settings = ymapToObject<TreeTestSettings>(yjs.settings)

    const state = zustandStore.getState()

    // Content-based comparison (not JSON.stringify which fails on key ordering)
    if (!nodesAreEqual(nodes, state.nodes)) {
      state.setNodes(nodes)
    }
    if (!tasksAreEqual(tasks, state.tasks)) {
      state.setTasks(tasks)
    }
    if (!settingsAreEqual(settings as Record<string, unknown>, state.settings as unknown as Record<string, unknown>)) {
      Object.entries(settings).forEach(([key, value]) => {
        if (value !== undefined && (state.settings as Record<string, unknown>)[key] !== value) {
          state.setSettings({ [key]: value } as Partial<TreeTestSettings>)
        }
      })
    }

    // Keep the flag set through the current microtask to block any
    // synchronous Zustand subscription callbacks from writing back to Yjs
    queueMicrotask(() => {
      isSyncingFromYjsRef.current = false
    })
  }, [doc, getYjsStructures, zustandStore])

  // Initialize: Load Zustand data into Yjs (if Yjs is empty)
  useEffect(() => {
    if (!doc || !isSynced || !enabled || isReadyRef.current) return

    const yjs = getYjsStructures()
    if (!yjs) return

    // Check if Yjs is empty (first user to connect)
    const yjsIsEmpty =
      yjs.nodes.length === 0 && yjs.tasks.length === 0 && yjs.settings.size === 0

    if (yjsIsEmpty && (zustandNodes.length > 0 || zustandTasks.length > 0)) {
      // Initialize Yjs from Zustand
      syncToYjs()
    } else if (!yjsIsEmpty) {
      // Yjs has data, sync to Zustand
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
    zustandNodes.length,
    zustandTasks.length,
  ])

  // Set up Yjs observers to sync REMOTE changes to Zustand.
  // Uses observeDeep for simplicity instead of multiple shallow observers.
  // Only syncs when the change did NOT originate from our own Zustand subscription
  // (checked via transaction origin).
  useEffect(() => {
    if (!doc || !enabled || !isSynced || !isReadyRef.current) return

    const yjs = getYjsStructures()
    if (!yjs) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleChange = (_events: any[], transaction: Y.Transaction) => {
      // Skip changes we made ourselves (from Zustand subscription)
      if (transaction.origin === ORIGIN_LOCAL) return
      if (isSyncingToYjsRef.current) return
      syncToZustand()
    }

    yjs.nodes.observeDeep(handleChange)
    yjs.tasks.observeDeep(handleChange)
    yjs.settings.observeDeep(handleChange)

    return () => {
      yjs.nodes.unobserveDeep(handleChange)
      yjs.tasks.unobserveDeep(handleChange)
      yjs.settings.unobserveDeep(handleChange)
    }
  }, [doc, enabled, isSynced, getYjsStructures, syncToZustand])

  // Set up Zustand subscription to sync LOCAL changes to Yjs.
  // Skips when the change originated from a Yjs update (isSyncingFromYjsRef).
  // Also does a content-based check to avoid writing identical data.
  useEffect(() => {
    if (!doc || !enabled || !isSynced || !isReadyRef.current) return

    const unsubscribe = zustandStore.subscribe((state, prevState) => {
      // Skip if we're currently syncing FROM Yjs (prevents ping-pong)
      if (isSyncingFromYjsRef.current) return
      // Skip if we're currently syncing TO Yjs (prevents re-entry)
      if (isSyncingToYjsRef.current) return

      // Check what changed (reference comparison for quick skip)
      const nodesChanged = state.nodes !== prevState.nodes
      const tasksChanged = state.tasks !== prevState.tasks
      const settingsChanged = state.settings !== prevState.settings

      if (!nodesChanged && !tasksChanged && !settingsChanged) return

      // Content-based check: compare Zustand data against what's already in Yjs.
      // This prevents writing back identical data that just came from Yjs
      // (different object references but same content).
      const yjs = getYjsStructures()
      if (!yjs) return

      let shouldSyncNodes = false
      let shouldSyncTasks = false
      let shouldSyncSettings = false

      if (nodesChanged) {
        const yjsNodes = yarrayToArray<TreeNode>(yjs.nodes)
        shouldSyncNodes = !nodesAreEqual(yjsNodes, state.nodes)
      }
      if (tasksChanged) {
        const yjsTasks = yarrayToArray<Task>(yjs.tasks)
        shouldSyncTasks = !tasksAreEqual(yjsTasks, state.tasks)
      }
      if (settingsChanged) {
        const yjsSettings = ymapToObject<Record<string, unknown>>(yjs.settings)
        shouldSyncSettings = !settingsAreEqual(
          yjsSettings,
          state.settings as unknown as Record<string, unknown>
        )
      }

      if (!shouldSyncNodes && !shouldSyncTasks && !shouldSyncSettings) return

      isSyncingToYjsRef.current = true
      doc.transact(() => {
        if (shouldSyncNodes) {
          setYArrayFromArray(yjs.nodes, state.nodes)
        }
        if (shouldSyncTasks) {
          setYArrayFromArray(yjs.tasks, state.tasks)
        }
        if (shouldSyncSettings) {
          setYMapFromObject(yjs.settings, state.settings)
        }
      }, ORIGIN_LOCAL)
      isSyncingToYjsRef.current = false
    })

    return () => {
      unsubscribe()
    }
  }, [doc, enabled, isSynced, getYjsStructures, zustandStore])

  return {
    isReady: isReadyRef.current,
    syncToYjs,
    syncToZustand,
  }
}
