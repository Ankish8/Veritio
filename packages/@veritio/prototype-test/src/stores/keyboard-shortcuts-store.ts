'use client'

import { create } from 'zustand'
import type {
  KeyboardShortcut,
  KeyboardShortcutsState,
  ShortcutsContext,
  ShortcutSection,
  ShortcutDisplayItem,
} from '../lib/keyboard-shortcuts/types'
// Sequence timeout in milliseconds (time to wait for next key in sequence)
const SEQUENCE_TIMEOUT = 1000

// Category display order for consistent UI
// Actions comes first for primary tab-specific actions
const CATEGORY_ORDER: Record<string, number> = {
  'Actions': 0,
  'Navigation': 1,
  'View': 2,
  'General': 3,
  'Tree Navigation': 4,
  'Tree Editing': 5,
  'Tree Moving': 6,
  'Cards': 7,
  'Categories': 8,
  'Questions': 9,
  'Tasks': 10,
  'Paths': 11,
  'Editing': 12,
}

export const useKeyboardShortcutsStore = create<KeyboardShortcutsState>()((set, get) => ({
  // ─── State ────────────────────────────────────
  shortcuts: new Map<string, KeyboardShortcut>(),
  activeContext: null,
  sequenceBuffer: [],
  sequenceTimeoutId: null,

  // ─── Registration Actions ─────────────────────

  registerShortcut: (shortcut) => {
    set((state) => {
      const newShortcuts = new Map(state.shortcuts)
      newShortcuts.set(shortcut.id, {
        ...shortcut,
        enabled: shortcut.enabled ?? true,
        priority: shortcut.priority ?? 0,
      })
      return { shortcuts: newShortcuts }
    })
  },

  registerShortcuts: (shortcuts) => {
    set((state) => {
      const newShortcuts = new Map(state.shortcuts)
      for (const shortcut of shortcuts) {
        newShortcuts.set(shortcut.id, {
          ...shortcut,
          enabled: shortcut.enabled ?? true,
          priority: shortcut.priority ?? 0,
        })
      }
      return { shortcuts: newShortcuts }
    })
  },

  unregisterShortcut: (id) => {
    set((state) => {
      const newShortcuts = new Map(state.shortcuts)
      newShortcuts.delete(id)
      return { shortcuts: newShortcuts }
    })
  },

  unregisterShortcuts: (ids) => {
    set((state) => {
      const newShortcuts = new Map(state.shortcuts)
      for (const id of ids) {
        newShortcuts.delete(id)
      }
      return { shortcuts: newShortcuts }
    })
  },

  clearAll: () => {
    set({ shortcuts: new Map() })
  },

  // ─── Context Actions ──────────────────────────

  setActiveContext: (context) => {
    set({ activeContext: context })
  },

  // ─── Sequence Actions ─────────────────────────

  addToSequence: (key) => {
    const state = get()

    // Clear existing timeout
    if (state.sequenceTimeoutId) {
      clearTimeout(state.sequenceTimeoutId)
    }

    // Add key to buffer
    const newBuffer = [...state.sequenceBuffer, key]

    // Set new timeout to clear buffer
    // Use a WeakRef pattern to avoid calling set() if store is stale
    const currentShortcuts = state.shortcuts
    const timeoutId = setTimeout(() => {
      // Only clear if store still exists and hasn't been reset
      const currentState = get()
      if (currentState.shortcuts === currentShortcuts) {
        set({ sequenceBuffer: [], sequenceTimeoutId: null })
      }
    }, SEQUENCE_TIMEOUT)

    set({
      sequenceBuffer: newBuffer,
      sequenceTimeoutId: timeoutId,
    })
  },

  clearSequence: () => {
    const state = get()
    if (state.sequenceTimeoutId) {
      clearTimeout(state.sequenceTimeoutId)
    }
    set({ sequenceBuffer: [], sequenceTimeoutId: null })
  },

  // ─── Selectors ────────────────────────────────

  getActiveShortcuts: () => {
    const state = get()
    const { shortcuts, activeContext } = state

    // Determine if we're in a builder context (any builder-* context)
    const isBuilderContext = activeContext?.startsWith('builder') ?? false

    return Array.from(shortcuts.values()).filter((shortcut) => {
      // Must be enabled
      if (shortcut.enabled === false) return false

      // Global shortcuts are always active
      if (shortcut.context === 'global') return true

      // Context-specific shortcuts only active in their context
      if (activeContext === null) return shortcut.context === 'default'

      // On builder pages, include both 'builder' shortcuts and specific sub-context shortcuts
      if (isBuilderContext) {
        // General builder shortcuts (tab nav, save, etc.) are active
        if (shortcut.context === 'builder') return true
        // Specific sub-context shortcuts (tree editing, tasks, etc.) are also active
        return shortcut.context === activeContext
      }

      return shortcut.context === activeContext
    })
  },

  getShortcutsByContext: (context) => {
    const state = get()
    return Array.from(state.shortcuts.values()).filter(
      (shortcut) => shortcut.context === context && shortcut.enabled !== false
    )
  },

  getShortcutSections: () => {
    const activeShortcuts = get().getActiveShortcuts()

    // Group shortcuts by category
    const categoryMap = new Map<string, ShortcutDisplayItem[]>()

    for (const shortcut of activeShortcuts) {
      const category = shortcut.category
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push({
        action: shortcut.description,
        keys: shortcut.keys,
        alternative: shortcut.alternative,
      })
    }

    // Convert to sections and sort by category order
    const sections: ShortcutSection[] = Array.from(categoryMap.entries())
      .map(([title, shortcuts]) => ({ title, shortcuts }))
      .sort((a, b) => {
        const orderA = CATEGORY_ORDER[a.title] ?? 100
        const orderB = CATEGORY_ORDER[b.title] ?? 100
        return orderA - orderB
      })

    return sections
  },
}))

// ─── Convenience Selectors ────────────────────

export const useActiveContext = () =>
  useKeyboardShortcutsStore((state) => state.activeContext)

export const useSequenceBuffer = () =>
  useKeyboardShortcutsStore((state) => state.sequenceBuffer)

// Get raw shortcuts map for computing sections
export const useShortcutsMap = () =>
  useKeyboardShortcutsStore((state) => state.shortcuts)
