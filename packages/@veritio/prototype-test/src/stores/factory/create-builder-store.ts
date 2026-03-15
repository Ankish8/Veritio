/**
 * Builder Store Factory
 *
 * Creates study builder stores with consistent patterns for:
 * - Version-based dirty detection (O(1) instead of O(n) deep equality)
 * - Persist middleware with skipHydration
 * - SSR-safe client-side hydration
 * - Standard save status management
 *
 * @example
 * ```typescript
 * const result = createBuilderStore<CardSortData, CardSortSnapshot, CardSortExtensions>({
 *   name: 'card-sort-builder',
 *   dataFields: { fields: ['cards', 'categories', 'settings'] },
 *   defaults: { cards: [], categories: [], settings: defaultSettings },
 *   extensions: (set, get) => ({
 *     addCard: (card) => set(s => ({ cards: [...s.cards, card] })),
 *   }),
 * })
 * ```
 */

import { create, type StoreApi } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createSnapshot } from '@veritio/prototype-test/lib/utils/deep-equal'
import type {
  BuilderStoreConfig,
  BuilderStoreResult,
  BaseBuilderState,
  SaveStatus,
} from './types'
export function createBuilderStore<
  TData extends object,
  TSnapshot extends object = TData,
  TExtensions extends object = Record<string, never>
>(
  config: BuilderStoreConfig<TData, TSnapshot, TExtensions>
): BuilderStoreResult<BaseBuilderState<TSnapshot> & TData & TExtensions, TSnapshot> {
  type TState = BaseBuilderState<TSnapshot> & TData & TExtensions

  const {
    name,
    dataFields,
    defaults,
    defaultSettings,
    additionalResetFields = {} as Partial<TExtensions>,
    extensions,
    customPartialize,
    customLoadFromApi,
    customMarkSavedWithData,
  } = config

  // Build the partialize array (fields to persist)
  // NOTE: Do NOT persist _version, _savedVersion, or _snapshot - these are memory-only
  // _version/_savedVersion: dirty tracking is memory-only, rehydration resets to 0/0
  // _snapshot: deep clone of data fields, doubles storage size for no benefit (loadFromApi recreates it)
  const partializeFields: (keyof TState)[] = customPartialize || [
    ...dataFields.fields,
    'studyId',
  ] as (keyof TState)[]

  // Create snapshot from current data fields
  const createDataSnapshot = (state: TState): TSnapshot => {
    const snapshotData: Record<string, unknown> = {}
    for (const field of dataFields.fields) {
      snapshotData[field as string] = state[field as keyof TState]
    }
    return createSnapshot(snapshotData) as TSnapshot
  }

  // Create snapshot from provided data
  const createSnapshotFromData = (data: Record<string, unknown>): TSnapshot => {
    const snapshotData: Record<string, unknown> = {}
    for (const field of dataFields.fields) {
      snapshotData[field as string] = data[field as string]
    }
    return createSnapshot(snapshotData) as TSnapshot
  }

  // Check if current state is dirty using version comparison (O(1))
  const selectIsDirty = (state: TState): boolean => {
    return state._version !== state._savedVersion
  }

  // Set of data field names for quick lookup
  const dataFieldSet = new Set(dataFields.fields.map(String))

  // Check if an update touches any data fields
  const touchesDataFields = (partial: Partial<TState>): boolean => {
    for (const key of Object.keys(partial)) {
      if (dataFieldSet.has(key)) return true
    }
    return false
  }

  // Create the store
  const store = create<TState>()(
    persist(
      (rawSet, get) => {
        // Wrap set to auto-increment _version when data fields change
        const set = (partial: Partial<TState> | ((state: TState) => Partial<TState>)) => {
          const update = typeof partial === 'function' ? partial(get()) : partial
          if (touchesDataFields(update as Partial<TState>)) {
            // Data field changed - increment version
            const currentVersion = get()._version ?? 0
            rawSet({ ...update, _version: currentVersion + 1 } as Partial<TState>)
          } else {
            rawSet(update as Partial<TState>)
          }
        }

        // Base state and actions
        const baseState: BaseBuilderState<TSnapshot> & TData = {
          // Data defaults
          ...defaults,

          // Snapshot (legacy, kept for persistence compatibility)
          _snapshot: null,

          // Version-based dirty detection
          _version: 0,
          _savedVersion: 0,

          // Meta
          studyId: null,
          saveStatus: 'idle' as SaveStatus,
          lastSavedAt: null,
          isHydrated: false,

          // Base actions
          setStudyId: (studyId) => rawSet({ studyId } as Partial<TState>),
          setHydrated: (isHydrated) => rawSet({ isHydrated } as Partial<TState>),
          setSaveStatus: (saveStatus) => rawSet({ saveStatus } as Partial<TState>),

          markSaved: () => {
            const state = get()
            rawSet({
              _snapshot: createDataSnapshot(state),
              _savedVersion: state._version,
              saveStatus: 'saved',
              lastSavedAt: Date.now(),
            } as Partial<TState>)
          },

          markClean: () => {
            const state = get()
            rawSet({
              _snapshot: createDataSnapshot(state),
              _savedVersion: state._version,
            } as Partial<TState>)
          },

          reset: () => {
            const resetState: Partial<TState> = {
              ...defaults,
              ...additionalResetFields,
              _snapshot: null,
              _version: 0,
              _savedVersion: 0,
              studyId: null,
              saveStatus: 'idle' as SaveStatus,
              lastSavedAt: null,
              isHydrated: false,
            } as Partial<TState>
            rawSet(resetState)
          },
        }

        // Get extensions (study-specific state and actions)
        const extensionState = extensions
          ? extensions(set as StoreApi<TState>['setState'], get as StoreApi<TState>['getState'])
          : ({} as TExtensions)

        // Add markSavedWithData action
        const markSavedWithData = customMarkSavedWithData
          ? (data: TSnapshot) => customMarkSavedWithData(set as StoreApi<TState>['setState'], data)
          : (data: TSnapshot) => {
              const state = get()
              rawSet({
                _snapshot: createSnapshot(data) as TSnapshot,
                _savedVersion: state._version,
                saveStatus: 'saved',
                lastSavedAt: Date.now(),
              } as Partial<TState>)
            }

        // Add loadFromApi action
        const loadFromApi = customLoadFromApi
          ? (data: TData & { studyId: string }) =>
              customLoadFromApi(set as StoreApi<TState>['setState'], get as StoreApi<TState>['getState'], data)
          : (data: TData & { studyId: string }) => {
              // Merge each data field with its defaults (handles API returning {} for new studies)
              const mergedData = { ...data }
              if (defaults) {
                for (const field of dataFields.fields) {
                  const key = field as string
                  const defaultValue = (defaults as Record<string, unknown>)[key]
                  const dataValue = (data as Record<string, unknown>)[key]
                  if (defaultValue && typeof defaultValue === 'object' && !Array.isArray(defaultValue) && dataValue && typeof dataValue === 'object' && !Array.isArray(dataValue)) {
                    ;(mergedData as Record<string, unknown>)[key] = { ...defaultValue, ...dataValue as Record<string, unknown> }
                  }
                }
              }
              if (defaultSettings && 'settings' in data && data.settings) {
                ;(mergedData as Record<string, unknown>).settings = {
                  ...defaultSettings,
                  ...(data.settings as Record<string, unknown>),
                }
              }

              const snapshot = createSnapshotFromData(mergedData as Record<string, unknown>)
              // Reset versions when loading fresh data
              const newVersion = (get()._version ?? 0) + 1
              rawSet({
                ...mergedData,
                _snapshot: snapshot,
                _version: newVersion,
                _savedVersion: newVersion, // Data is fresh from API, so it's clean
                saveStatus: 'idle' as SaveStatus,
                lastSavedAt: Date.now(),
              } as unknown as Partial<TState>)
            }

        // Combine all state and actions
        return {
          ...baseState,
          ...extensionState,
          markSavedWithData,
          loadFromApi,
        } as TState
      },
      {
        name,
        storage: createJSONStorage(() => ({
          getItem: (key: string) => localStorage.getItem(key),
          setItem: (key: string, value: string) => {
            try {
              localStorage.setItem(key, value)
            } catch {
              // QuotaExceededError — store works in-memory, just won't persist across reloads
            }
          },
          removeItem: (key: string) => localStorage.removeItem(key),
        })),
        partialize: (state) => {
          const partial: Record<string, unknown> = {}
          for (const field of partializeFields) {
            partial[field as string] = state[field]
          }
          return partial as Partial<TState>
        },
        skipHydration: true,
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.isHydrated = true
          } else {
            store.setState({ isHydrated: true } as Partial<TState>)
          }
        },
      }
    )
  )

  // Trigger hydration once at module load (client-side only)
  if (typeof window !== 'undefined') {
    store.persist.rehydrate()
  }

  // Create the isDirty hook
  const useIsDirty = () => store(selectIsDirty)

  return {
    useStore: store,
    useIsDirty,
    store,
  }
}
