'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useKeyboardShortcutsStore } from '@/stores/keyboard-shortcuts-store'
import { useFloatingActionBar } from '@/components/analysis/shared/floating-action-bar'
import { useKeyboardHandler } from './use-keyboard-handler'
import {
  createNavigationShortcuts,
  createViewShortcuts,
  GLOBAL_SHORTCUTS_DISPLAY,
  getBuilderShortcuts,
  getModifierKey,
} from '@/lib/keyboard-shortcuts'
import type { KeyboardShortcut, ShortcutsContext } from '@/lib/keyboard-shortcuts/types'

/** Sets up global keyboard shortcuts for the dashboard. Call once in the dashboard layout. */
export function useGlobalShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get floating action bar context for panel toggle and shortcut sections sync
  const { togglePanel, setShortcutSections, setShortcutActiveContext } = useFloatingActionBar()

  // Store actions
  const registerShortcuts = useKeyboardShortcutsStore((s) => s.registerShortcuts)
  const unregisterShortcuts = useKeyboardShortcutsStore((s) => s.unregisterShortcuts)
  const setActiveContext = useKeyboardShortcutsStore((s) => s.setActiveContext)
  const getShortcutSections = useKeyboardShortcutsStore((s) => s.getShortcutSections)
  const storeActiveContext = useKeyboardShortcutsStore((s) => s.activeContext)
  const shortcuts = useKeyboardShortcutsStore((s) => s.shortcuts)

  // Sync shortcut sections from store → floating action bar context
  useEffect(() => {
    setShortcutSections(getShortcutSections())
    setShortcutActiveContext(storeActiveContext)
  }, [shortcuts, storeActiveContext, getShortcutSections, setShortcutSections, setShortcutActiveContext])

  // Enable keyboard handler
  useKeyboardHandler({ enabled: true })

  // Detect if we're on a builder page
  const isBuilderPage = pathname?.includes('/builder') ?? false

  // Create shortcuts with handlers based on context
  const allShortcuts = useMemo(() => {
    const shortcuts: KeyboardShortcut[] = []

    // View shortcuts are always available
    const viewShortcuts = createViewShortcuts({
      toggleShortcutsPanel: () => togglePanel('shortcuts'),
    })
    shortcuts.push(...viewShortcuts)

    // Navigation shortcuts (G+D, G+P, etc.) - available everywhere
    const navShortcuts = createNavigationShortcuts(router)
    shortcuts.push(...navShortcuts)

    if (isBuilderPage) {
      // On builder pages: also register builder action shortcuts
      // Tab navigation is registered by the builder page itself (it knows the study type)
      const MOD = getModifierKey()

      // Builder action shortcuts - dispatch custom events that builder page listens to
      shortcuts.push({
        id: 'builder-save',
        category: 'General',
        description: 'Save changes',
        keys: [[MOD, 'S']],
        context: 'builder',
        handler: (e) => {
          e.preventDefault()
          // Dispatch custom event for builder to handle
          window.dispatchEvent(new CustomEvent('builder:save'))
        },
      })

      shortcuts.push({
        id: 'builder-preview',
        category: 'General',
        description: 'Preview study',
        keys: [[MOD, 'P']],
        context: 'builder',
        handler: (e) => {
          e.preventDefault()
          // Dispatch custom event for builder to handle
          window.dispatchEvent(new CustomEvent('builder:preview'))
        },
      })
    }

    return shortcuts
  }, [router, togglePanel, isBuilderPage])

  // Register all shortcuts
  useEffect(() => {
    const ids = allShortcuts.map((s) => s.id)
    registerShortcuts(allShortcuts)

    return () => {
      unregisterShortcuts(ids)
    }
  }, [allShortcuts, registerShortcuts, unregisterShortcuts])

  // Track registered context shortcuts to avoid race conditions
  const registeredContextIdsRef = useRef<string[]>([])

  // Auto-detect context from URL
  useEffect(() => {
    let context: ShortcutsContext = 'default'

    // Check for builder pages
    if (isBuilderPage) {
      const tab = searchParams.get('tab')

      // Determine context based on current tab
      // This enables tab-specific action shortcuts
      switch (tab) {
        case 'tree':
          context = 'builder-tree'
          break
        case 'tasks':
          context = 'builder-tasks'
          break
        case 'content':
          context = 'builder-card-sort-content'
          break
        case 'study-flow':
          // Survey uses study-flow tab for questions
          context = 'builder-survey-flow'
          break
        case 'prototype':
          context = 'builder-prototype'
          break
        case 'prototype-tasks':
          context = 'builder-prototype-tasks'
          break
        default:
          // Default to generic builder context (details, settings, branding tabs)
          context = 'builder'
      }
    } else if (pathname?.includes('/results')) {
      context = 'results'
    }

    setActiveContext(context)

    // Unregister previous context shortcuts immediately (before registering new ones)
    if (registeredContextIdsRef.current.length > 0) {
      unregisterShortcuts(registeredContextIdsRef.current)
      registeredContextIdsRef.current = []
    }

    // Register context-specific shortcuts (for builder sub-contexts like tree editing)
    const contextShortcuts = getBuilderShortcuts(context || 'default')
    if (contextShortcuts.length > 0) {
      const ids = contextShortcuts.map((s) => s.id)
      registerShortcuts(contextShortcuts)
      registeredContextIdsRef.current = ids
    }

    // Cleanup on unmount
    return () => {
      if (registeredContextIdsRef.current.length > 0) {
        unregisterShortcuts(registeredContextIdsRef.current)
        registeredContextIdsRef.current = []
      }
    }
  }, [pathname, searchParams, isBuilderPage, setActiveContext, registerShortcuts, unregisterShortcuts])
}

/** Returns shortcut data for display purposes only (no handlers). */
export function useGlobalShortcutsDisplay(): KeyboardShortcut[] {
  return GLOBAL_SHORTCUTS_DISPLAY
}
