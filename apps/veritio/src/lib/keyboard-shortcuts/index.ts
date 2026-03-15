'use client'

/**
 * Keyboard Shortcuts Library
 *
 * Central module for all keyboard shortcut functionality.
 *
 * @example
 * ```tsx
 * import { useKeyboardHandler, useRegisterShortcuts } from './index'
 *
 * // In your component
 * useKeyboardHandler() // Enable global keyboard handling
 * useRegisterShortcuts({ shortcuts: MY_SHORTCUTS, context: 'my-context' })
 * ```
 */

// Types
export type {
  KeyboardShortcut,
  ShortcutsContext,
  ShortcutCategory,
  ShortcutSection,
  ShortcutDisplayItem,
  KeyboardShortcutsState,
  UseKeyboardHandlerOptions,
  UseRegisterShortcutsOptions,
} from './types'

// Utilities
export {
  isMac,
  getModifierKey,
  normalizeKey,
  getEventKey,
  matchesKeyCombo,
  matchesKeySequence,
  isInputElement,
  isOverlayOpen,
  formatKeyForDisplay,
  getBufferKey,
} from './utils'

// Global shortcuts
export {
  createNavigationShortcuts,
  createViewShortcuts,
  GLOBAL_SHORTCUTS_DISPLAY,
} from './global-shortcuts'

// Builder shortcuts
export {
  createBuilderTabShortcuts,
  createBuilderActionShortcuts,
  BUILDER_TAB_SHORTCUTS_DISPLAY,
  TREE_NAVIGATION_SHORTCUTS,
  TREE_MOVING_SHORTCUTS,
  TREE_EDITING_SHORTCUTS,
  TREE_BUILDER_SHORTCUTS,
  TREE_TASKS_SHORTCUTS,
  CARD_SORT_CONTENT_SHORTCUTS,
  SURVEY_FLOW_SHORTCUTS,
  PROTOTYPE_TAB_SHORTCUTS,
  PROTOTYPE_TASKS_SHORTCUTS,
  RESULTS_SHORTCUTS,
  DEFAULT_SHORTCUTS,
  getBuilderShortcuts,
} from './builder-shortcuts'
