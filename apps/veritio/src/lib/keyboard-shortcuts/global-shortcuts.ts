'use client'

import type { KeyboardShortcut } from './types'
import { getModifierKey } from './utils'

/**
 * Global Keyboard Shortcuts
 *
 * These shortcuts are available across the entire dashboard.
 * They handle:
 * - Quick navigation between pages (G + letter)
 * - Panel toggles (?, Cmd+B)
 * - Common actions
 *
 * Note: Handlers are created dynamically in useGlobalShortcuts hook
 * because they need access to router and floating action bar context.
 */

const MOD = getModifierKey()

/**
 * Creates page navigation shortcuts
 * These use the "G then X" pattern for quick page navigation.
 * Context is 'global' so they work from anywhere in the app.
 */
export function createNavigationShortcuts(router: { push: (path: string) => void }): KeyboardShortcut[] {
  return [
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      description: 'Go to Dashboard',
      keys: [['G'], ['D']],
      context: 'global',
      handler: () => {
        router.push('/')
      },
    },
    {
      id: 'nav-projects',
      category: 'Navigation',
      description: 'Go to Projects',
      keys: [['G'], ['P']],
      context: 'global',
      handler: () => {
        router.push('/projects')
      },
    },
    {
      id: 'nav-studies',
      category: 'Navigation',
      description: 'Go to Studies',
      keys: [['G'], ['S']],
      context: 'global',
      handler: () => {
        router.push('/studies')
      },
    },
    {
      id: 'nav-archive',
      category: 'Navigation',
      description: 'Go to Archive',
      keys: [['G'], ['A']],
      context: 'global',
      handler: () => {
        router.push('/archive')
      },
    },
    {
      id: 'nav-settings',
      category: 'Navigation',
      description: 'Go to Settings',
      keys: [['G'], [',']],
      context: 'global',
      handler: () => {
        router.push('/settings')
      },
    },
  ]
}

/**
 * Creates view/panel shortcuts
 */
export function createViewShortcuts(actions: {
  toggleShortcutsPanel: () => void
}): KeyboardShortcut[] {
  return [
    {
      id: 'toggle-shortcuts-panel',
      category: 'View',
      description: 'Toggle keyboard shortcuts',
      keys: [['?']],
      context: 'global',
      handler: (e) => {
        e.preventDefault()
        actions.toggleShortcutsPanel()
      },
      priority: 10, // High priority to ensure it captures
    },
    {
      id: 'toggle-sidebar',
      category: 'View',
      description: 'Toggle sidebar',
      keys: [[MOD, 'B']],
      context: 'global',
      // Note: This is handled by sidebar.tsx's own keyboard listener.
      // We do NOT add a handler here to avoid double-toggle.
      // This shortcut is included for display purposes only.
    },
    {
      id: 'close-panel',
      category: 'View',
      description: 'Close panel / Go back',
      keys: [['Esc']],
      context: 'global',
      priority: -10, // Low priority - let other handlers take precedence
    },
  ]
}

/**
 * Static shortcut definitions for display only (no handlers).
 * Used when we just need to show shortcuts in the panel.
 */
export const GLOBAL_SHORTCUTS_DISPLAY: KeyboardShortcut[] = [
  // Navigation (available everywhere)
  {
    id: 'nav-dashboard',
    category: 'Navigation',
    description: 'Go to Dashboard',
    keys: [['G'], ['D']],
    context: 'global',
  },
  {
    id: 'nav-projects',
    category: 'Navigation',
    description: 'Go to Projects',
    keys: [['G'], ['P']],
    context: 'global',
  },
  {
    id: 'nav-studies',
    category: 'Navigation',
    description: 'Go to Studies',
    keys: [['G'], ['S']],
    context: 'global',
  },
  {
    id: 'nav-archive',
    category: 'Navigation',
    description: 'Go to Archive',
    keys: [['G'], ['A']],
    context: 'global',
  },
  {
    id: 'nav-settings',
    category: 'Navigation',
    description: 'Go to Settings',
    keys: [['G'], [',']],
    context: 'global',
  },
  // View (shown everywhere)
  {
    id: 'toggle-shortcuts-panel',
    category: 'View',
    description: 'Toggle keyboard shortcuts',
    keys: [['?']],
    context: 'global',
  },
  {
    id: 'toggle-sidebar',
    category: 'View',
    description: 'Toggle sidebar',
    keys: [[MOD, 'B']],
    context: 'global',
  },
  {
    id: 'close-panel',
    category: 'View',
    description: 'Close panel / Go back',
    keys: [['Esc']],
    context: 'global',
  },
]
