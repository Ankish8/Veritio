'use client'

import { Suspense } from 'react'
import { useGlobalShortcuts } from '@/hooks/use-global-shortcuts'

/**
 * Internal component that uses the shortcuts hook
 * Separated to allow Suspense boundary for useSearchParams
 */
function ShortcutsHandler({ children }: { children: React.ReactNode }) {
  useGlobalShortcuts()
  return <>{children}</>
}

/**
 * KeyboardShortcutsProvider
 *
 * Client component that initializes global keyboard shortcuts.
 * This must be rendered inside FloatingActionBarProvider and SidebarProvider
 * because useGlobalShortcuts depends on those contexts.
 *
 * The hook:
 * - Enables global keyboard event handling
 * - Registers navigation shortcuts (G+D, G+P, etc.)
 * - Registers panel toggle shortcuts (?, Cmd+B)
 * - Auto-detects context from URL to show relevant shortcuts
 *
 * Wrapped in Suspense because useGlobalShortcuts uses useSearchParams
 */
export function KeyboardShortcutsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<>{children}</>}>
      <ShortcutsHandler>{children}</ShortcutsHandler>
    </Suspense>
  )
}
