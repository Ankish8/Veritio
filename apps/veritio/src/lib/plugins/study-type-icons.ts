/**
 * Study Type Icon Mapping
 *
 * Maps study types to their Lucide icon components.
 * This replaces scattered icon imports throughout the codebase.
 */

import {
  Layers3,
  GitBranch,
  ClipboardList,
  MousePointerClick,
  Frame,
  Eye,
  Globe,
  AppWindow,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'
import type { StudyType } from '@veritio/core'

/**
 * Map of study types to their icon components
 */
export const STUDY_TYPE_ICONS: Record<StudyType, LucideIcon> = {
  card_sort: Layers3,
  tree_test: GitBranch,
  survey: ClipboardList,
  first_click: MousePointerClick,
  prototype_test: Frame,
  first_impression: Eye,
  live_website_test: Globe,
}

/**
 * Get the icon component for a study type
 */
export function getStudyTypeIconComponent(studyType: StudyType): LucideIcon {
  return STUDY_TYPE_ICONS[studyType] ?? HelpCircle
}

/**
 * Study type display names
 */
export const STUDY_TYPE_NAMES: Record<StudyType, string> = {
  card_sort: 'Card Sort',
  tree_test: 'Tree Test',
  survey: 'Survey',
  first_click: 'First Click',
  prototype_test: 'Figma Prototype Test',
  first_impression: 'First Impression',
  live_website_test: 'Web App Test',
}

/**
 * Get the display name for a study type
 */
export function getStudyTypeDisplayName(studyType: StudyType): string {
  return STUDY_TYPE_NAMES[studyType] ?? studyType
}

/**
 * Study type subtitles — short context lines for lists/tables
 */
export const STUDY_TYPE_SUBTITLES: Record<StudyType, string> = {
  card_sort: 'Organize content into groups',
  tree_test: 'Test your navigation hierarchy',
  survey: 'Collect feedback with custom questions',
  first_click: 'Test where users click first',
  prototype_test: 'Test clickable Figma prototypes',
  first_impression: 'Capture reactions to brief exposure',
  live_website_test: 'Heatmaps, recordings, JS tracking',
}

/**
 * Get the subtitle for a study type
 */
export function getStudyTypeSubtitle(studyType: StudyType): string {
  return STUDY_TYPE_SUBTITLES[studyType] ?? ''
}

/**
 * Study type descriptions
 */
export const STUDY_TYPE_DESCRIPTIONS: Record<StudyType, string> = {
  card_sort: 'Discover how users naturally organize and categorize your content',
  tree_test: 'Validate your navigation structure and information architecture',
  survey: 'Collect feedback and insights with customizable questionnaires',
  first_click: 'Measure where users click first on your designs to complete tasks',
  prototype_test: 'Test interactive Figma prototypes with real users to validate designs',
  first_impression: 'Capture immediate reactions by showing designs for a brief moment',
  live_website_test: 'Test any live website to capture authentic user interactions and feedback',
}

/**
 * Get the description for a study type
 */
export function getStudyTypeDescription(studyType: StudyType): string {
  return STUDY_TYPE_DESCRIPTIONS[studyType] ?? ''
}

/**
 * All study types in display order
 */
export const ALL_STUDY_TYPES: StudyType[] = [
  'card_sort',
  'tree_test',
  'survey',
  'first_click',
  'prototype_test',
  'first_impression',
  'live_website_test',
]

/**
 * Use-case category for the creation grid
 */
export type UseCaseCategory = 'ia' | 'usability' | 'design' | 'feedback'

/**
 * A use-case card in the study creation flow.
 * Multiple use-cases can map to the same underlying StudyType.
 */
export interface UseCaseDefinition {
  id: string
  studyType: StudyType
  name: string
  subtitle: string
  description: string
  icon: LucideIcon
  category: UseCaseCategory
  defaultSettings?: Record<string, unknown>
  comingSoon?: boolean
}

/**
 * Use-case cards for the study creation grid.
 * Two cards can map to the same StudyType with different defaults.
 */
export const USE_CASES: UseCaseDefinition[] = [
  {
    id: 'card_sort',
    studyType: 'card_sort',
    name: 'Card Sort',
    subtitle: 'Organize content into groups',
    description: 'Discover how users naturally organize and categorize your content',
    icon: Layers3,
    category: 'ia',
  },
  {
    id: 'tree_test',
    studyType: 'tree_test',
    name: 'Tree Test',
    subtitle: 'Test your navigation hierarchy',
    description: 'Validate your navigation structure and information architecture',
    icon: GitBranch,
    category: 'ia',
  },
  {
    id: 'figma_prototype_test',
    studyType: 'prototype_test',
    name: 'Figma Prototype Test',
    subtitle: 'Test clickable Figma prototypes',
    description: 'Test interactive Figma prototypes with real users to validate designs',
    icon: Frame,
    category: 'usability',
  },
  {
    id: 'website_prototype_test',
    studyType: 'live_website_test',
    name: 'Website Prototype Test',
    subtitle: 'Just paste a URL, no code needed',
    description: 'Test any landing page or prototype from Lovable, v0, Bolt, Replit, or any URL',
    icon: AppWindow,
    category: 'usability',
    defaultSettings: { mode: 'reverse_proxy', createdFromUseCase: 'website_prototype_test' },
  },
  {
    id: 'web_app_test',
    studyType: 'live_website_test',
    name: 'Web App Test',
    subtitle: 'Install a snippet on your domain',
    description: 'Add a lightweight script to your production site for on-site testing with real users',
    icon: Globe,
    category: 'usability',
    defaultSettings: { mode: 'snippet', createdFromUseCase: 'web_app_test' },
  },
  {
    id: 'first_click',
    studyType: 'first_click',
    name: 'First Click Test',
    subtitle: 'Test where users click first',
    description: 'Measure where users click first on your designs to complete tasks',
    icon: MousePointerClick,
    category: 'design',
  },
  {
    id: 'first_impression',
    studyType: 'first_impression',
    name: 'First Impression Test',
    subtitle: 'Capture reactions to brief exposure',
    description: 'Capture immediate reactions by showing designs for a brief moment',
    icon: Eye,
    category: 'design',
  },
  {
    id: 'survey',
    studyType: 'survey',
    name: 'Survey',
    subtitle: 'Collect feedback with custom questions',
    description: 'Collect feedback and insights with customizable questionnaires',
    icon: ClipboardList,
    category: 'feedback',
  },
]

/**
 * Returns all visible study types.
 */
export function useVisibleStudyTypes(): StudyType[] {
  return ALL_STUDY_TYPES
}

/**
 * Returns all visible use cases.
 */
export function useVisibleUseCases(): UseCaseDefinition[] {
  return USE_CASES
}
