import type { StoreApi, UseBoundStore } from 'zustand'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface BaseBuilderState<TSnapshot> {
  _snapshot: TSnapshot | null
  // Version-based dirty detection (O(1) instead of deep equality)
  _version: number
  _savedVersion: number

  studyId: string | null
  saveStatus: SaveStatus
  lastSavedAt: number | null
  isHydrated: boolean

  // Base actions (always present)
  setStudyId: (studyId: string | null) => void
  setHydrated: (hydrated: boolean) => void
  setSaveStatus: (status: SaveStatus) => void
  markSaved: () => void
  markClean: () => void
  reset: () => void
}

export interface SnapshotConfig<TData> {
  fields: (keyof TData)[]
}

export interface PersistConfig<TState> {
  name: string
  partialize: (keyof TState)[]
}

export interface BuilderStoreConfig<
  TData extends object,
  TSnapshot extends object,
  TExtensions extends object = Record<string, never>
> {
  name: string
  dataFields: SnapshotConfig<TData>
  defaults: TData
  defaultSettings?: 'settings' extends keyof TData ? TData['settings'] : unknown
  additionalResetFields?: Partial<TExtensions>
  extensions?: (
    set: StoreApi<BaseBuilderState<TSnapshot> & TData & TExtensions>['setState'],
    get: StoreApi<BaseBuilderState<TSnapshot> & TData & TExtensions>['getState']
  ) => TExtensions
  customPartialize?: (keyof (BaseBuilderState<TSnapshot> & TData & TExtensions))[]
  customLoadFromApi?: (
    set: StoreApi<BaseBuilderState<TSnapshot> & TData & TExtensions>['setState'],
    get: StoreApi<BaseBuilderState<TSnapshot> & TData & TExtensions>['getState'],
    data: TData & { studyId: string }
  ) => void
  customMarkSavedWithData?: (
    set: StoreApi<BaseBuilderState<TSnapshot> & TData & TExtensions>['setState'],
    data: TSnapshot
  ) => void
}

export interface BuilderStoreResult<TState, TSnapshot> {
  useStore: UseBoundStore<StoreApi<TState>>
  useIsDirty: () => boolean
  store: StoreApi<TState>
}

export type MarkSavedWithDataFn<TSnapshot> = (data: TSnapshot) => void

export type LoadFromApiFn<TData> = (data: TData & { studyId: string }) => void
