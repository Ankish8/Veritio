/**
 * Plugin Registration
 *
 * This module registers all study type plugins with the plugin registry.
 * During the migration phase, plugins reference existing components in
 * the main app. As components are migrated to packages, this file will
 * import directly from @veritio/* packages.
 *
 * @example
 * ```typescript
 * // After full migration
 * import { cardSortPluginConfig } from '@veritio/card-sort'
 * import { treeTestPluginConfig } from '@veritio/tree-test'
 *
 * pluginRegistry.register(cardSortPluginConfig)
 * pluginRegistry.register(treeTestPluginConfig)
 * ```
 */

import type { StudyType } from '@veritio/core'

// =============================================================================
// PLUGIN CONFIGURATIONS (Phase 1: Inline definitions)
// =============================================================================
// These will be migrated to their respective packages over time.
// For now, we define minimal configs that reference existing components.

/**
 * Card Sort plugin configuration
 */
const cardSortPlugin = {
  studyType: 'card_sort' as StudyType,
  name: 'Card Sort',
  description: 'Discover how users categorize and organize information',
  icon: 'layout-grid',
  version: '1.0.0',
  capabilities: {
    hasBuilder: true,
    hasPlayer: true,
    hasAnalysis: true,
    hasExport: true,
    supportsBranding: true,
    supportsStudyFlow: true,
  },
}

/**
 * Tree Test plugin configuration
 */
const treeTestPlugin = {
  studyType: 'tree_test' as StudyType,
  name: 'Tree Test',
  description: 'Test your navigation structure with real users',
  icon: 'git-branch',
  version: '1.0.0',
  capabilities: {
    hasBuilder: true,
    hasPlayer: true,
    hasAnalysis: true,
    hasExport: true,
    supportsBranding: true,
    supportsStudyFlow: true,
  },
}

/**
 * Survey plugin configuration
 */
const surveyPlugin = {
  studyType: 'survey' as StudyType,
  name: 'Survey',
  description: 'Collect feedback and insights with powerful survey tools',
  icon: 'clipboard-list',
  version: '1.0.0',
  capabilities: {
    hasBuilder: true,
    hasPlayer: true,
    hasAnalysis: true,
    hasExport: true,
    supportsBranding: true,
    supportsStudyFlow: true,
  },
}

/**
 * Prototype Test plugin configuration
 */
const prototypeTestPlugin = {
  studyType: 'prototype_test' as StudyType,
  name: 'Prototype Test',
  description: 'Test interactive prototypes and gather user feedback',
  icon: 'mouse-pointer-click',
  version: '1.0.0',
  capabilities: {
    hasBuilder: true,
    hasPlayer: true,
    hasAnalysis: true,
    hasExport: true,
    supportsBranding: true,
    supportsStudyFlow: true,
  },
}

/**
 * First Click plugin configuration
 */
const firstClickPlugin = {
  studyType: 'first_click' as StudyType,
  name: 'First Click',
  description: 'Understand where users click first on your designs',
  icon: 'mouse-pointer',
  version: '1.0.0',
  capabilities: {
    hasBuilder: true,
    hasPlayer: true,
    hasAnalysis: true,
    hasExport: true,
    supportsBranding: true,
    supportsStudyFlow: true,
  },
}

// =============================================================================
// PLUGIN REGISTRY
// =============================================================================

/**
 * Map of registered plugins by study type
 */
const plugins = new Map<StudyType, typeof cardSortPlugin>()

/**
 * Register all plugins
 */
export function initializePlugins(): void {
  plugins.set('card_sort', cardSortPlugin)
  plugins.set('tree_test', treeTestPlugin)
  plugins.set('survey', surveyPlugin)
  plugins.set('prototype_test', prototypeTestPlugin)
  plugins.set('first_click', firstClickPlugin)
}

/**
 * Get a plugin by study type
 */
export function getPlugin(studyType: StudyType) {
  return plugins.get(studyType)
}

/**
 * Get all registered plugins
 */
export function getAllPlugins() {
  return Array.from(plugins.values())
}

/**
 * Check if a plugin is registered
 */
export function hasPlugin(studyType: StudyType): boolean {
  return plugins.has(studyType)
}

// =============================================================================
// STUDY TYPE UTILITIES
// =============================================================================

/**
 * Study type metadata for UI display
 * This replaces hardcoded switch statements throughout the codebase.
 */
export function getStudyTypeInfo(studyType: StudyType) {
  const plugin = getPlugin(studyType)
  if (!plugin) {
    return {
      name: studyType,
      description: '',
      icon: 'help-circle',
    }
  }
  return {
    name: plugin.name,
    description: plugin.description,
    icon: plugin.icon,
  }
}

/**
 * Get study type display name
 */
export function getStudyTypeName(studyType: StudyType): string {
  return getPlugin(studyType)?.name ?? studyType
}

/**
 * Get study type icon
 */
export function getStudyTypeIcon(studyType: StudyType): string {
  return getPlugin(studyType)?.icon ?? 'help-circle'
}

// Initialize plugins on module load
initializePlugins()

// Export types
export type { StudyType }
