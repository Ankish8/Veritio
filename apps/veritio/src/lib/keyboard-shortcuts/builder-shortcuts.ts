'use client'

import type { KeyboardShortcut } from './types'
import { getModifierKey } from './utils'

/**
 * Builder Keyboard Shortcuts
 *
 * Shortcuts for study builders:
 * - Common: tab navigation, save
 * - Card Sort: card and category management
 * - Tree Test: tree navigation and editing
 * - Survey: question management
 * - Prototype Test: path and task management
 */

const MOD = getModifierKey()

// ─── Study Type to Tab Mapping ───────────────────────────
// Different study types have different tabs in position 2
type StudyType = 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression'

interface TabInfo {
  id: string
  label: string
}

const STUDY_TYPE_TABS: Record<StudyType, TabInfo[]> = {
  card_sort: [
    { id: 'details', label: 'Details' },
    { id: 'content', label: 'Content' },
    { id: 'study-flow', label: 'Study Flow' },
    { id: 'settings', label: 'Settings' },
    { id: 'branding', label: 'Branding' },
  ],
  tree_test: [
    { id: 'details', label: 'Details' },
    { id: 'tree', label: 'Tree' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'study-flow', label: 'Study Flow' },
    { id: 'settings', label: 'Settings' },
    { id: 'branding', label: 'Branding' },
  ],
  survey: [
    { id: 'details', label: 'Details' },
    { id: 'study-flow', label: 'Survey' },
    { id: 'settings', label: 'Settings' },
    { id: 'branding', label: 'Branding' },
  ],
  prototype_test: [
    { id: 'details', label: 'Details' },
    { id: 'prototype', label: 'Prototype' },
    { id: 'prototype-tasks', label: 'Tasks' },
    { id: 'study-flow', label: 'Study Flow' },
    { id: 'settings', label: 'Settings' },
    { id: 'branding', label: 'Branding' },
  ],
  first_click: [
    { id: 'details', label: 'Details' },
    { id: 'first-click-tasks', label: 'Tasks' },
    { id: 'study-flow', label: 'Study Flow' },
    { id: 'settings', label: 'Settings' },
    { id: 'branding', label: 'Branding' },
  ],
  first_impression: [
    { id: 'details', label: 'Details' },
    { id: 'first-impression-designs', label: 'Designs' },
    { id: 'study-flow', label: 'Study Flow' },
    { id: 'settings', label: 'Settings' },
    { id: 'branding', label: 'Branding' },
  ],
}

/**
 * Creates builder tab navigation shortcuts with handlers
 * These shortcuts navigate between builder tabs using 1-6 keys
 */
export function createBuilderTabShortcuts(
  studyType: StudyType | null,
  router: { replace: (path: string, options?: { scroll?: boolean }) => void },
  pathname: string,
  currentParams: string
): KeyboardShortcut[] {
  if (!studyType) return []

  const tabs = STUDY_TYPE_TABS[studyType]
  if (!tabs) return []

  return tabs.map((tab, index) => ({
    id: `builder-tab-${index + 1}`,
    category: 'Navigation',
    description: `Go to ${tab.label} tab`,
    keys: [[String(index + 1)]],
    context: 'builder' as const,
    handler: () => {
      // Build URL with updated tab parameter
      const params = new URLSearchParams(currentParams)
      if (tab.id === 'details') {
        params.delete('tab') // details is the default, keep URL clean
      } else {
        params.set('tab', tab.id)
      }
      const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.replace(newURL, { scroll: false })
    },
  }))
}

/**
 * Creates builder action shortcuts (save, preview, back)
 */
export function createBuilderActionShortcuts(actions: {
  onSave?: () => void
  onPreview?: () => void
  onBack?: () => void
}): KeyboardShortcut[] {
  const shortcuts: KeyboardShortcut[] = [
    {
      id: 'builder-save',
      category: 'General',
      description: 'Save changes',
      keys: [[MOD, 'S']],
      context: 'builder',
      handler: (e) => {
        e.preventDefault()
        actions.onSave?.()
      },
    },
    {
      id: 'builder-preview',
      category: 'General',
      description: 'Preview study',
      keys: [[MOD, 'P']],
      context: 'builder',
      handler: (e) => {
        e.preventDefault()
        actions.onPreview?.()
      },
    },
  ]

  if (actions.onBack) {
    shortcuts.push({
      id: 'builder-back',
      category: 'Navigation',
      description: 'Back to project',
      keys: [['Esc']],
      context: 'builder',
      priority: -5, // Lower priority than modal close
      handler: () => {
        actions.onBack?.()
      },
    })
  }

  return shortcuts
}

/**
 * Static display-only shortcuts for builder tabs (shown in panel)
 */
export const BUILDER_TAB_SHORTCUTS_DISPLAY: KeyboardShortcut[] = [
  {
    id: 'builder-tab-1',
    category: 'Navigation',
    description: 'Go to Details tab',
    keys: [['1']],
    context: 'builder',
  },
  {
    id: 'builder-tab-2',
    category: 'Navigation',
    description: 'Go to Content tab',
    keys: [['2']],
    context: 'builder',
  },
  {
    id: 'builder-tab-3',
    category: 'Navigation',
    description: 'Go to Tasks tab',
    keys: [['3']],
    context: 'builder',
  },
  {
    id: 'builder-tab-4',
    category: 'Navigation',
    description: 'Go to Study Flow tab',
    keys: [['4']],
    context: 'builder',
  },
  {
    id: 'builder-tab-5',
    category: 'Navigation',
    description: 'Go to Settings tab',
    keys: [['5']],
    context: 'builder',
  },
  {
    id: 'builder-tab-6',
    category: 'Navigation',
    description: 'Go to Branding tab',
    keys: [['6']],
    context: 'builder',
  },
  {
    id: 'builder-save',
    category: 'General',
    description: 'Save changes',
    keys: [[MOD, 'S']],
    context: 'builder',
  },
  {
    id: 'builder-preview',
    category: 'General',
    description: 'Preview study',
    keys: [[MOD, 'P']],
    context: 'builder',
  },
]

// ─── Builder Details Tab ────────────────────────────────

export const BUILDER_DETAILS_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'details-next-field',
    category: 'Editing',
    description: 'Next field',
    keys: [['Tab']],
    context: 'builder',  // Generic builder context - works on all builder pages
  },
  {
    id: 'details-prev-field',
    category: 'Editing',
    description: 'Previous field',
    keys: [['Shift', 'Tab']],
    context: 'builder',  // Generic builder context - works on all builder pages
  },
]

// ─── Tree Test: Tree Tab ────────────────────────

export const TREE_NAVIGATION_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'tree-nav-up',
    category: 'Tree Navigation',
    description: 'Navigate up',
    keys: [['↑']],
    context: 'builder-tree',
  },
  {
    id: 'tree-nav-down',
    category: 'Tree Navigation',
    description: 'Navigate down',
    keys: [['↓']],
    context: 'builder-tree',
  },
  {
    id: 'tree-collapse',
    category: 'Tree Navigation',
    description: 'Collapse node',
    keys: [['←']],
    context: 'builder-tree',
  },
  {
    id: 'tree-expand',
    category: 'Tree Navigation',
    description: 'Expand node',
    keys: [['→']],
    context: 'builder-tree',
  },
  {
    id: 'tree-start-move',
    category: 'Tree Navigation',
    description: 'Start moving node',
    keys: [['Space']],
    context: 'builder-tree',
  },
  {
    id: 'tree-edit',
    category: 'Tree Navigation',
    description: 'Edit selected node',
    keys: [['Enter']],
    context: 'builder-tree',
  },
]

export const TREE_MOVING_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'tree-move-up',
    category: 'Tree Moving',
    description: 'Move node up',
    keys: [['↑']],
    context: 'builder-tree',
  },
  {
    id: 'tree-move-down',
    category: 'Tree Moving',
    description: 'Move node down',
    keys: [['↓']],
    context: 'builder-tree',
  },
  {
    id: 'tree-move-indent',
    category: 'Tree Moving',
    description: 'Indent (make child)',
    keys: [['→']],
    context: 'builder-tree',
  },
  {
    id: 'tree-move-outdent',
    category: 'Tree Moving',
    description: 'Outdent (make sibling)',
    keys: [['←']],
    context: 'builder-tree',
  },
  {
    id: 'tree-move-confirm',
    category: 'Tree Moving',
    description: 'Confirm new position',
    keys: [['Enter']],
    context: 'builder-tree',
  },
  {
    id: 'tree-move-cancel',
    category: 'Tree Moving',
    description: 'Cancel move',
    keys: [['Esc']],
    context: 'builder-tree',
  },
]

export const TREE_EDITING_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'tree-add-sibling',
    category: 'Tree Editing',
    description: 'Add sibling node',
    keys: [['Enter']],
    context: 'builder-tree',
  },
  {
    id: 'tree-add-child',
    category: 'Tree Editing',
    description: 'Add child node',
    keys: [['Shift', 'Enter']],
    context: 'builder-tree',
  },
  {
    id: 'tree-edit-cancel',
    category: 'Tree Editing',
    description: 'Cancel editing',
    keys: [['Esc']],
    context: 'builder-tree',
  },
  {
    id: 'tree-indent',
    category: 'Tree Editing',
    description: 'Indent node',
    keys: [['Tab']],
    context: 'builder-tree',
  },
  {
    id: 'tree-outdent',
    category: 'Tree Editing',
    description: 'Outdent node',
    keys: [['Shift', 'Tab']],
    context: 'builder-tree',
  },
  {
    id: 'tree-delete',
    category: 'Tree Editing',
    description: 'Delete node',
    keys: [['Backspace']],
    alternative: [['Delete']],
    context: 'builder-tree',
  },
]

// Combined tree shortcuts for display
export const TREE_BUILDER_SHORTCUTS: KeyboardShortcut[] = [
  ...TREE_NAVIGATION_SHORTCUTS,
  ...TREE_EDITING_SHORTCUTS,
]

// ─── Tree Test: Tasks Tab ───────────────────────

export const TREE_TASKS_SHORTCUTS: KeyboardShortcut[] = [
  // Primary actions
  {
    id: 'tasks-add',
    category: 'Actions',
    description: 'Add new task',
    keys: [['N']],
    context: 'builder-tasks',
    handler: (e) => {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('builder:add-tree-task'))
    },
  },
  {
    id: 'tasks-delete',
    category: 'Actions',
    description: 'Delete task',
    keys: [['Backspace']],
    alternative: [['Delete']],
    context: 'builder-tasks',
    handler: (e) => {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('builder:delete-tree-task'))
    },
  },
  {
    id: 'tasks-duplicate',
    category: 'Actions',
    description: 'Duplicate task',
    keys: [[MOD, 'D']],
    context: 'builder-tasks',
    handler: (e) => {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('builder:duplicate-tree-task'))
    },
  },
]

// ─── Card Sort Builder: Content Tab ──────────────────────────

export const CARD_SORT_CONTENT_SHORTCUTS: KeyboardShortcut[] = [
  // Card selection and deletion
  {
    id: 'cards-delete',
    category: 'Actions',
    description: 'Delete selected card',
    keys: [['Delete']],
    context: 'builder-card-sort-content',
    handler: (e) => {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('builder:delete-card'))
    },
  },
  {
    id: 'cards-next',
    category: 'Actions',
    description: 'Select next card',
    keys: [['ArrowDown']],
    context: 'builder-card-sort-content',
    handler: (e) => {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('builder:next-card'))
    },
  },
  {
    id: 'cards-previous',
    category: 'Actions',
    description: 'Select previous card',
    keys: [['ArrowUp']],
    context: 'builder-card-sort-content',
    handler: (e) => {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('builder:previous-card'))
    },
  },
]

// ─── Survey Builder: Study Flow Tab ─────────────────────────────

export const SURVEY_FLOW_SHORTCUTS: KeyboardShortcut[] = [
  // Primary actions
  {
    id: 'question-add',
    category: 'Actions',
    description: 'Add new question',
    keys: [['N']],
    context: 'builder-survey-flow',
    handler: (e) => {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('builder:add-question'))
    },
  },
  {
    id: 'question-delete',
    category: 'Actions',
    description: 'Delete question',
    keys: [['Backspace']],
    alternative: [['Delete']],
    context: 'builder-survey-flow',
    handler: (e) => {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('builder:delete-question'))
    },
  },
  {
    id: 'question-duplicate',
    category: 'Actions',
    description: 'Duplicate question',
    keys: [[MOD, 'D']],
    context: 'builder-survey-flow',
    handler: (e) => {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('builder:duplicate-question'))
    },
  },
]

// ─── Prototype Test Builder: Prototype Tab ─────────────────────

export const PROTOTYPE_TAB_SHORTCUTS: KeyboardShortcut[] = [
  // Primary actions for prototype tab (frame/path management)
  {
    id: 'path-add',
    category: 'Actions',
    description: 'Add new pathway',
    keys: [['N']],
    context: 'builder-prototype',
    handler: (e) => {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('builder:add-path'))
    },
  },
  {
    id: 'path-delete',
    category: 'Actions',
    description: 'Delete pathway',
    keys: [['Backspace']],
    alternative: [['Delete']],
    context: 'builder-prototype',
    handler: (e) => {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('builder:delete-path'))
    },
  },
]

// ─── Prototype Test Builder: Tasks Tab ─────────────────────

export const PROTOTYPE_TASKS_SHORTCUTS: KeyboardShortcut[] = [
  // Primary actions for tasks tab
  {
    id: 'prototype-task-add',
    category: 'Actions',
    description: 'Add new task',
    keys: [['N']],
    context: 'builder-prototype-tasks',
    handler: (e) => {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('builder:add-prototype-task'))
    },
  },
  {
    id: 'prototype-task-delete',
    category: 'Actions',
    description: 'Delete task',
    keys: [['Backspace']],
    alternative: [['Delete']],
    context: 'builder-prototype-tasks',
    handler: (e) => {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('builder:delete-prototype-task'))
    },
  },
]

// ─── Results Page ───────────────────────────────

export const RESULTS_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'results-export',
    category: 'General',
    description: 'Export data',
    keys: [[MOD, 'E']],
    context: 'results',
  },
  {
    id: 'results-refresh',
    category: 'General',
    description: 'Refresh data',
    keys: [[MOD, 'R']],
    context: 'results',
  },
  {
    id: 'results-nav-prev',
    category: 'Navigation',
    description: 'Previous participant',
    keys: [['←']],
    context: 'results',
  },
  {
    id: 'results-nav-next',
    category: 'Navigation',
    description: 'Next participant',
    keys: [['→']],
    context: 'results',
  },
]

// ─── Default/Dashboard Shortcuts ────────────────

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'default-new-project',
    category: 'General',
    description: 'Create new project',
    keys: [[MOD, 'N']],
    context: 'default',
  },
]

// ─── Helper to get shortcuts by context ─────────

export function getBuilderShortcuts(context: string): KeyboardShortcut[] {
  switch (context) {
    case 'builder-tree':
      return TREE_BUILDER_SHORTCUTS
    case 'builder-tasks':
      return TREE_TASKS_SHORTCUTS
    case 'builder-card-sort-content':
      return CARD_SORT_CONTENT_SHORTCUTS
    case 'builder-survey-flow':
      return SURVEY_FLOW_SHORTCUTS
    case 'builder-prototype':
      return PROTOTYPE_TAB_SHORTCUTS
    case 'builder-prototype-tasks':
      return PROTOTYPE_TASKS_SHORTCUTS
    case 'results':
      return RESULTS_SHORTCUTS
    case 'default':
      return DEFAULT_SHORTCUTS
    default:
      return []
  }
}
