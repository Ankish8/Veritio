'use client'

export type ShortcutsContext =
  | 'default'
  | 'builder'
  | 'builder-card-sort-content'
  | 'builder-tree'
  | 'builder-tasks'
  | 'builder-survey-flow'
  | 'builder-prototype'
  | 'builder-prototype-tasks'
  | 'results'
  | null

export type ShortcutCategory =
  | 'Actions'
  | 'Navigation'
  | 'View'
  | 'General'
  | 'Editing'
  | 'Tree Navigation'
  | 'Tree Editing'
  | 'Tree Moving'
  | 'Cards'
  | 'Categories'
  | 'Questions'
  | 'Tasks'
  | 'Paths'
export interface KeyboardShortcut {
  id: string
  category: ShortcutCategory
  description: string
  keys: string[][]
  alternative?: string[][]
  context: ShortcutsContext | 'global'
  handler?: (e: KeyboardEvent) => void | boolean
  enabled?: boolean
  priority?: number
}

export interface ShortcutSection {
  title: string
  shortcuts: ShortcutDisplayItem[]
}

export interface ShortcutDisplayItem {
  action: string
  keys: string[][]
  alternative?: string[][]
}

export interface KeyboardShortcutsState {
  shortcuts: Map<string, KeyboardShortcut>
  activeContext: ShortcutsContext
  sequenceBuffer: string[]
  sequenceTimeoutId: ReturnType<typeof setTimeout> | null

  registerShortcut: (shortcut: KeyboardShortcut) => void
  registerShortcuts: (shortcuts: KeyboardShortcut[]) => void
  unregisterShortcut: (id: string) => void
  unregisterShortcuts: (ids: string[]) => void
  clearAll: () => void
  setActiveContext: (context: ShortcutsContext) => void
  addToSequence: (key: string) => void
  clearSequence: () => void

  getActiveShortcuts: () => KeyboardShortcut[]
  getShortcutsByContext: (context: ShortcutsContext | 'global') => KeyboardShortcut[]
  getShortcutSections: () => ShortcutSection[]
}

export interface UseKeyboardHandlerOptions {
  enabled?: boolean
  ignoreInputs?: boolean
}

export interface UseRegisterShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  context?: ShortcutsContext
  deps?: React.DependencyList
}
