import type { ComponentType } from 'react'
import type { StoreApi, UseBoundStore } from 'zustand'
import type {
  StudyType,
  ValidationResult,
  ValidationIssue,
  SaveStatus,
  BuilderTabConfig,
  ResultsTabConfig,
  PdfSectionDefinition,
} from '../types'

export interface BaseBuilderState<TSnapshot> {
  _snapshot: TSnapshot | null
  studyId: string | null
  saveStatus: SaveStatus
  lastSavedAt: number | null
  isHydrated: boolean

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

export interface BuilderStoreResult<TState> {
  useStore: UseBoundStore<StoreApi<TState>>
  useIsDirty: () => boolean
  store: StoreApi<TState>
}

export interface PlayerConfigInput<TProps extends object = object> {
  Component: ComponentType<TProps>
  Skeleton: ComponentType
  extractSettings: (rawSettings: Record<string, unknown>) => Partial<TProps>
  defaultProps?: Partial<TProps>
  validateProps?: (props: TProps) => ValidationResult
}

export interface PlayerConfigResult<TProps extends object> {
  Component: ComponentType<TProps>
  Skeleton: ComponentType
  extractSettings: (rawSettings: Record<string, unknown>) => Partial<TProps>
  validateProps: (props: TProps) => ValidationResult
}

export interface ValidationConfigInput<TInput extends object> {
  validate: (input: TInput) => ValidationResult
  validators?: {
    content?: (input: TInput) => ValidationIssue[]
    flow?: (input: TInput) => ValidationIssue[]
    settings?: (input: TInput) => ValidationIssue[]
  }
  priorityMap?: Record<string, 'error' | 'warning' | 'info'>
}

export interface ValidationConfigResult<TInput extends object> {
  validate: (input: TInput) => ValidationResult
  validateContent: (input: TInput) => ValidationIssue[]
  validateFlow: (input: TInput) => ValidationIssue[]
  validateSettings: (input: TInput) => ValidationIssue[]
}

export interface ResultsConfigInput<TResults extends object> {
  tabs: ResultsTabConfig[]
  endpoint: (studyId: string) => string
  transformResponse?: (response: unknown) => TResults
  OverviewComponent: ComponentType<{ studyId: string; results: TResults }>
}

export interface ResultsConfigResult<TResults extends object> {
  tabs: ResultsTabConfig[]
  endpoint: (studyId: string) => string
  transformResponse: (response: unknown) => TResults
  OverviewComponent: ComponentType<{ studyId: string; results: TResults }>
}

export interface ExportConfigInput {
  pdfSections: PdfSectionDefinition[]
  exportToCsv?: (data: unknown) => string | Promise<string>
  exportToExcel?: (data: unknown) => Blob | Promise<Blob>
  exportToPdf?: (data: unknown, sections: string[]) => Promise<Blob>
}

export interface ExportConfigResult {
  pdfSections: PdfSectionDefinition[]
  getSections: () => PdfSectionDefinition[]
  getDefaultSections: () => string[]
  getSectionById: (id: string) => PdfSectionDefinition | undefined
  exportToCsv: (data: unknown) => string | Promise<string>
  exportToExcel: (data: unknown) => Blob | Promise<Blob>
  exportToPdf: (data: unknown, sections: string[]) => Promise<Blob>
}

export interface StudyTypePluginInput<
  TBuilderData extends object,
  TBuilderSnapshot extends object,
  TBuilderExtensions extends object,
  TSettings extends object,
  TPlayerProps extends object,
  TValidationInput extends object,
  TResults extends object
> {
  studyType: StudyType
  name: string
  description: string
  icon: string
  builderTabs: BuilderTabConfig[]
  builderStore: BuilderStoreConfig<TBuilderData, TBuilderSnapshot, TBuilderExtensions>
  ContentEditor: ComponentType<{ studyId: string }>
  player: PlayerConfigInput<TPlayerProps>
  validation: ValidationConfigInput<TValidationInput>
  results: ResultsConfigInput<TResults>
  export: ExportConfigInput
  capabilities?: {
    hasBuilder?: boolean
    hasPlayer?: boolean
    hasAnalysis?: boolean
    hasExport?: boolean
    supportsBranding?: boolean
    supportsStudyFlow?: boolean
  }
  hooks?: {
    onStudyCreate?: (studyId: string, settings: TSettings) => Promise<void>
    onStudyDuplicate?: (sourceStudyId: string, newStudyId: string) => Promise<void>
    onStudyArchive?: (studyId: string) => Promise<void>
    onStudyDelete?: (studyId: string) => Promise<void>
  }
}
