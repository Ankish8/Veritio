import type { ComponentType } from 'react'
import type { ZodSchema } from 'zod'

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type StudyType =
  | 'card_sort'
  | 'tree_test'
  | 'survey'
  | 'prototype_test'
  | 'first_click'
  | 'first_impression'
  | 'live_website_test'

export type ClosingRuleType = 'none' | 'date' | 'participant_count' | 'both'

export interface ClosingRule {
  type: ClosingRuleType
  closeDate?: string
  maxParticipants?: number
  closeMessage?: string
}

export const DEFAULT_CLOSING_RULE: ClosingRule = {
  type: 'both',
  maxParticipants: 100,
}

export interface ValidationIssue {
  id: string
  code: string
  message: string
  severity: 'error' | 'warning' | 'info'
  section?: string
  field?: string
  navigationPath?: {
    tab?: string
    section?: string
    itemId?: string
  }
}

export interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
  issueCount: number
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface BuilderTabConfig {
  id: string
  label: string
  icon?: ComponentType<{ className?: string }>
  badge?: string | number
}

export interface BuilderConfig<TData, TSettings> {
  tabs: BuilderTabConfig[]
  defaultSettings: TSettings
  useStore: () => BuilderStoreState<TData, TSettings>
  ContentEditor: ComponentType<{ studyId: string }>
  SettingsPanel?: ComponentType<{ studyId: string }>
}

export interface BuilderStoreState<TData, TSettings> {
  data: TData
  settings: TSettings
  studyId: string | null
  saveStatus: SaveStatus
  lastSavedAt: number | null
  isHydrated: boolean
  isDirty: boolean
  setData: (data: Partial<TData>) => void
  setSettings: (settings: Partial<TSettings>) => void
  loadFromApi: (data: TData & { settings: TSettings; studyId: string }) => void
  markSaved: () => void
  markSavedWithData: (data: TData & { settings: TSettings }) => void
  reset: () => void
}

export interface PlayerConfig<TProps extends object = object> {
  Component: ComponentType<TProps>
  Skeleton: ComponentType
  extractSettings: (rawSettings: Record<string, unknown>) => Partial<TProps>
  validateProps?: (props: TProps) => ValidationResult
}

export interface ResultsTabConfig {
  id: string
  label: string
  icon?: ComponentType<{ className?: string }>
  component: ComponentType<{ studyId: string; results: unknown }>
}

export interface ResultsConfig<TResults> {
  tabs: ResultsTabConfig[]
  endpoint: (studyId: string) => string
  transformResponse?: (response: unknown) => TResults
  OverviewComponent: ComponentType<{ studyId: string; results: TResults }>
}

export interface ValidationConfig<TInput extends object> {
  validate: (input: TInput) => ValidationResult
  validators?: {
    content?: (input: TInput) => ValidationIssue[]
    flow?: (input: TInput) => ValidationIssue[]
    settings?: (input: TInput) => ValidationIssue[]
  }
}

export interface PdfSectionDefinition {
  id: string
  title: string
  description: string
  category: 'overview' | 'analysis' | 'questionnaire'
  isDefault: boolean
  requiresData: string[]
  chartElements: Array<{
    id: string
    domSelector: string
    title: string
  }>
  isDynamic?: boolean
}

export interface ExportConfig {
  pdfSections: PdfSectionDefinition[]
  exportToCsv?: (data: unknown) => string | Promise<string>
  exportToExcel?: (data: unknown) => Blob | Promise<Blob>
  exportToPdf?: (data: unknown, sections: string[]) => Promise<Blob>
}

export interface StudyTypePlugin<
  TBuilderData extends object = object,
  TSettings extends object = object,
  TPlayerProps extends object = object,
  TValidationInput extends object = object,
  TResults extends object = object
> {
  studyType: StudyType
  name: string
  description: string
  icon: string
  version: string

  capabilities: {
    hasBuilder: boolean
    hasPlayer: boolean
    hasAnalysis: boolean
    hasExport: boolean
    supportsBranding: boolean
    supportsStudyFlow: boolean
  }

  builder: BuilderConfig<TBuilderData, TSettings>
  player: PlayerConfig<TPlayerProps>
  results: ResultsConfig<TResults>
  validation: ValidationConfig<TValidationInput>
  export: ExportConfig
  settingsSchema: ZodSchema<TSettings>

  hooks?: {
    onStudyCreate?: (studyId: string, settings: TSettings) => Promise<void>
    onStudyDuplicate?: (sourceStudyId: string, newStudyId: string) => Promise<void>
    onStudyArchive?: (studyId: string) => Promise<void>
    onStudyDelete?: (studyId: string) => Promise<void>
  }
}
