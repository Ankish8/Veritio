'use client'

import { useEffect, useRef } from 'react'
import { useKeyboardShortcutsStore } from '@/stores/keyboard-shortcuts-store'
import type { UseRegisterShortcutsOptions } from '@/lib/keyboard-shortcuts/types'

/** Registers keyboard shortcuts on mount and unregisters on unmount. */
export function useRegisterShortcuts(options: UseRegisterShortcutsOptions) {
  const { shortcuts, context, deps = [] } = options

  const registerShortcuts = useKeyboardShortcutsStore((s) => s.registerShortcuts)
  const unregisterShortcuts = useKeyboardShortcutsStore((s) => s.unregisterShortcuts)
  const setActiveContext = useKeyboardShortcutsStore((s) => s.setActiveContext)

  const registeredIdsRef = useRef<string[]>([])

  useEffect(() => {
    if (shortcuts.length === 0) return

    const ids = shortcuts.map((s) => s.id)

    if (registeredIdsRef.current.length > 0) {
      unregisterShortcuts(registeredIdsRef.current)
    }

    registerShortcuts(shortcuts)
    registeredIdsRef.current = ids

    if (context !== undefined) {
      setActiveContext(context)
    }

    return () => {
      unregisterShortcuts(ids)
      registeredIdsRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcuts, context, ...deps])
}

/** Sets the active shortcuts context without registering new shortcuts. */
export function useShortcutContext(context: UseRegisterShortcutsOptions['context']) {
  const setActiveContext = useKeyboardShortcutsStore((s) => s.setActiveContext)

  useEffect(() => {
    if (context !== undefined) {
      setActiveContext(context)
    }

    return () => {
      setActiveContext(null)
    }
  }, [context, setActiveContext])
}
