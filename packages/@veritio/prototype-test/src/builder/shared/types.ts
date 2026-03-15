// =============================================================================
// Builder Shared Types — Barrel File
// Re-exports all types from domain-specific modules for backward compatibility.
// All existing imports from './types' continue to work.

import type { ReactNode } from 'react'
import type { ClosingRule as CoreClosingRule, ClosingRuleType as CoreClosingRuleType } from '@veritio/core'
import { DEFAULT_CLOSING_RULE as CORE_DEFAULT_CLOSING_RULE } from '@veritio/core'

// Domain-specific re-exports
export * from './recording-types'
export * from './sharing-types'
export * from './branding-types'
// Re-exports from @veritio/core

// Closing Rule types are now defined in @veritio/core for shared use
export type ClosingRule = CoreClosingRule
export type ClosingRuleType = CoreClosingRuleType
export const DEFAULT_CLOSING_RULE = CORE_DEFAULT_CLOSING_RULE
// Study Types

export type StudyType = 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'preference_test' | 'live_website_test'

export type StudyStatus = 'draft' | 'active' | 'paused' | 'completed'
// File Attachment Types

export interface FileAttachment {
  id: string
  url: string
  filename: string
  size: number
  mimeType: string
  uploadedAt: string
}
// Study Meta State (Details, Settings, Branding)

import type { SessionRecordingSettings, NotificationSettings, ResponsePreventionSettings } from './recording-types'
import type { SharingSettings } from './sharing-types'
import type { BrandingSettings } from './branding-types'

export interface StudyMeta {
  // Details Tab
  title: string
  description: string | null
  purpose: string | null
  participantRequirements: string | null
  folderId: string | null
  fileAttachments: FileAttachment[]

  // Settings Tab
  urlSlug: string | null
  language: string
  password: string | null
  sessionRecordingSettings: SessionRecordingSettings
  closingRule: CoreClosingRule
  responsePrevention: ResponsePreventionSettings
  notificationSettings: NotificationSettings

  // Branding Tab
  branding: BrandingSettings

  // Sharing Tab
  sharingSettings: SharingSettings

  // Metadata
  status: StudyStatus
  createdAt: string
  updatedAt: string | null
  launchedAt: string | null
  participantCount: number
}
// Builder Tab Types

export type BuilderTabId =
  | 'details'
  | 'content' // Card Sort unified (cards + categories)
  | 'cards' // Card Sort specific (legacy, kept for compatibility)
  | 'categories' // Card Sort specific (legacy, kept for compatibility)
  | 'tree' // Tree Test specific
  | 'tasks' // Tree Test specific
  | 'prototype' // Prototype Test specific - Figma import & preview
  | 'prototype-tasks' // Prototype Test specific - task configuration
  | 'first-click-tasks' // First-Click Test specific - image, tasks, AOIs
  | 'first-impression-designs' // First Impression Test - design variants with images
  | 'first-impression-questions' // First Impression Test - per-design questions
  | 'interview-script' // AI Interview - script editor
  | 'study-flow'
  | 'settings'
  | 'branding'
  | 'sharing' // Widget/link sharing settings

export interface BuilderTab {
  id: BuilderTabId
  label: string
  icon: ReactNode
  component: ReactNode
  badge?: number | string
  disabled?: boolean
  keepMounted?: boolean
}
// Shared Tab Component Props

export interface SharedTabProps {
  studyId: string
  studyType: StudyType
  isReadOnly?: boolean
}

export interface DetailsTabProps extends SharedTabProps {
  showFileAttachments?: boolean
  maxFileSize?: number // in bytes, default 10MB
}

export interface SettingsTabProps extends SharedTabProps {
  baseUrl?: string // Base URL for study link preview
}

export interface BrandingTabProps extends SharedTabProps {
  allowLogoUpload?: boolean
  allowColorCustomization?: boolean
}

export interface SharingTabProps extends SharedTabProps {
  shareCode?: string // The study's share code (available after launch)
  urlSlug?: string | null // Custom URL slug if set
  isBuilder?: boolean // Whether we're in the builder (vs results page)
  baseUrl?: string // Base URL for generating links
}
// Builder Shell Props

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export interface PresenceUserInfo {
  id: string
  name?: string
  email?: string
  avatarUrl?: string
}

export interface BuilderShellProps {
  studyId: string
  studyType: StudyType
  studyTitle: string
  projectId: string
  projectName?: string
  shareCode?: string // For copy link functionality (available after launch)
  tabs: BuilderTab[]
  defaultTab?: BuilderTabId
  activeTab: BuilderTabId
  onTabChange: (tab: BuilderTabId) => void
  onSave: () => Promise<unknown>
  isDirty: boolean
  saveStatus: SaveStatus
  lastSavedAt: number | null
  isStoreHydrated?: boolean
  presenceUsers?: PresenceUserInfo[]
  isRealtimeConnected?: boolean
}
// Upload Types

export interface UploadOptions {
  bucket: string
  path: string
  maxSize?: number // in bytes
  allowedTypes?: string[]
  onProgress?: (progress: number) => void
}

export interface UploadResult {
  url: string
  filename: string
  size: number
  mimeType: string
}
// Form Field Types

// Re-export from centralized i18n config for backwards compatibility
export { LANGUAGE_OPTIONS as SUPPORTED_LANGUAGES, type LanguageOption } from '../../i18n/config'
// Default Values

import { DEFAULT_SESSION_RECORDING } from './recording-types'
import { DEFAULT_NOTIFICATION_SETTINGS } from './recording-types'
import { DEFAULT_RESPONSE_PREVENTION } from './recording-types'
import { DEFAULT_SHARING_SETTINGS } from './sharing-types'
import { DEFAULT_BRANDING } from './branding-types'

export const DEFAULT_STUDY_META: StudyMeta = {
  title: '',
  description: null,
  purpose: null,
  participantRequirements: null,
  folderId: null,
  fileAttachments: [],
  urlSlug: null,
  language: 'en-US',
  password: null,
  sessionRecordingSettings: DEFAULT_SESSION_RECORDING,
  closingRule: DEFAULT_CLOSING_RULE,
  responsePrevention: DEFAULT_RESPONSE_PREVENTION,
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
  branding: DEFAULT_BRANDING,
  sharingSettings: DEFAULT_SHARING_SETTINGS,
  status: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: null,
  launchedAt: null,
  participantCount: 0,
}
// Utility Types

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
