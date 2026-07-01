'use client'

import { create } from 'zustand'
import type {
  KeyboardShortcut,
  KeyboardShortcutsState,
  ShortcutsContext,
  ShortcutSection,
  ShortcutDisplayItem,
} from '@/lib/keyboard-shortcuts/types'

const SEQUENCE_TIMEOUT = 1000

const CATEGORY_ORDER: Record<string, number> = {
  Actions: 0,
  Navigation: 1,
  View: 2,
  General: 3,
  'Tree Navigation': 4,
  'Tree Editing': 5,
  'Tree Moving': 6,
  Cards: 7,
  Categories: 8,
  Questions: 9,
  Tasks: 10,
  Paths: 11,
  Editing: 12,
}

export const useKeyboardShortcutsStore = create<KeyboardShortcutsState>()((set, get) => ({
  shortcuts: new Map<string, KeyboardShortcut>(),
  activeContext: null,
  sequenceBuffer: [],
  sequenceTimeoutId: null,

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

  setActiveContext: (context: ShortcutsContext) => {
    set({ activeContext: context })
  },

  addToSequence: (key) => {
    const state = get()

    if (state.sequenceTimeoutId) {
      clearTimeout(state.sequenceTimeoutId)
    }

    const newBuffer = [...state.sequenceBuffer, key]
    const currentShortcuts = state.shortcuts
    const timeoutId = setTimeout(() => {
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

  getActiveShortcuts: () => {
    const state = get()
    const { shortcuts, activeContext } = state
    const isBuilderContext = activeContext?.startsWith('builder') ?? false

    return Array.from(shortcuts.values()).filter((shortcut) => {
      if (shortcut.enabled === false) return false
      if (shortcut.context === 'global') return true
      if (activeContext === null) return shortcut.context === 'default'

      if (isBuilderContext) {
        if (shortcut.context === 'builder') return true
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

    return Array.from(categoryMap.entries())
      .map(([title, shortcuts]): ShortcutSection => ({ title, shortcuts }))
      .sort((a, b) => {
        const orderA = CATEGORY_ORDER[a.title] ?? 100
        const orderB = CATEGORY_ORDER[b.title] ?? 100
        return orderA - orderB
      })
  },
}))

export const useActiveContext = () =>
  useKeyboardShortcutsStore((state) => state.activeContext)

export const useSequenceBuffer = () =>
  useKeyboardShortcutsStore((state) => state.sequenceBuffer)

export const useShortcutsMap = () =>
  useKeyboardShortcutsStore((state) => state.shortcuts)
