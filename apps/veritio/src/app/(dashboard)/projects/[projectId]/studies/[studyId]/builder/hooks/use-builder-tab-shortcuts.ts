'use client'

import { useMemo, useEffect } from 'react'
import { useKeyboardShortcutsStore } from '@/stores/keyboard-shortcuts-store'
import type { KeyboardShortcut } from '@/lib/keyboard-shortcuts/types'
import type { BuilderTabId } from '@/components/builders/shared'

type StudyType = 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'

const STUDY_TYPE_TAB_MAPPINGS: Record<StudyType, { id: BuilderTabId; label: string }[]> = {
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
  live_website_test: [
    { id: 'details', label: 'Details' },
    { id: 'live-website-setup', label: 'Website' },
    { id: 'live-website-tasks', label: 'Tasks' },
    { id: 'study-flow', label: 'Study Flow' },
    { id: 'settings', label: 'Settings' },
    { id: 'branding', label: 'Branding' },
  ],
}

/**
 * Registers number-key shortcuts (1-N) for switching between builder tabs.
 * Shortcuts are automatically cleaned up on unmount or when study type changes.
 */
export function useBuilderTabShortcuts(
  studyType: StudyType,
  setActiveTab: (tab: BuilderTabId) => void
): void {
  const registerShortcuts = useKeyboardShortcutsStore((s) => s.registerShortcuts)
  const unregisterShortcuts = useKeyboardShortcutsStore((s) => s.unregisterShortcuts)

  const tabShortcuts = useMemo(() => {
    const tabMappings = STUDY_TYPE_TAB_MAPPINGS[studyType]
    if (!tabMappings) return []

    return tabMappings.map((tab, index): KeyboardShortcut => ({
      id: `builder-tab-${index + 1}`,
      category: 'Navigation',
      description: `Go to ${tab.label} tab`,
      keys: [[String(index + 1)]],
      context: 'builder',
      handler: () => setActiveTab(tab.id),
    }))
  }, [studyType, setActiveTab])

  useEffect(() => {
    if (tabShortcuts.length === 0) return

    const ids = tabShortcuts.map((s) => s.id)
    registerShortcuts(tabShortcuts)

    return () => {
      unregisterShortcuts(ids)
    }
  }, [tabShortcuts, registerShortcuts, unregisterShortcuts])
}
