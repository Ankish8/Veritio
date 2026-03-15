'use client'

import { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useKeyboardShortcutsStore } from '@/stores/keyboard-shortcuts-store'
import type { ShortcutsContext } from '../FloatingActionBarContext'
import type { ShortcutDisplayItem } from '@/lib/keyboard-shortcuts/types'

interface KeyboardShortcutsPanelProps {
  context?: ShortcutsContext
}

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

const KeyButton = ({ keyText }: { keyText: string }) => (
  <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded shadow-sm">
    {keyText}
  </kbd>
)

const ShortcutKeys = ({ keys }: { keys: string[][] }) => (
  <div className="flex items-center gap-1.5 flex-wrap justify-end">
    {keys.map((keyCombo, idx) => (
      <div key={idx} className="flex items-center gap-1">
        {keyCombo.map((key, keyIdx) => (
          <div key={keyIdx} className="flex items-center gap-1">
            <KeyButton keyText={key} />
            {keyIdx < keyCombo.length - 1 && (
              <span className="text-xs text-muted-foreground">+</span>
            )}
          </div>
        ))}
      </div>
    ))}
  </div>
)

export function KeyboardShortcutsPanel({ context }: KeyboardShortcutsPanelProps) {
  // Get raw state from store - these are stable references
  const shortcuts = useKeyboardShortcutsStore((state) => state.shortcuts)
  const activeContext = useKeyboardShortcutsStore((state) => state.activeContext)

  // Compute sections with useMemo to avoid infinite loop
  const shortcutSections = useMemo(() => {
    // Determine if we're in a builder context (any builder-* context)
    const isBuilderContext = activeContext?.startsWith('builder') ?? false

    // Filter shortcuts by active context
    const activeShortcuts = Array.from(shortcuts.values()).filter((shortcut) => {
      if (shortcut.enabled === false) return false
      if (shortcut.context === 'global') return true
      if (activeContext === null) return shortcut.context === 'default'

      // On builder pages, show both 'builder' shortcuts and specific sub-context shortcuts
      if (isBuilderContext) {
        // Show general builder shortcuts (tab nav, save, etc.)
        if (shortcut.context === 'builder') return true
        // Also show specific sub-context shortcuts (tree editing, tasks, etc.)
        return shortcut.context === activeContext
      }

      return shortcut.context === activeContext
    })

    // Group by category
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

    // Convert to sections and sort
    return Array.from(categoryMap.entries())
      .map(([title, items]) => ({ title, shortcuts: items }))
      .sort((a, b) => {
        const orderA = CATEGORY_ORDER[a.title] ?? 100
        const orderB = CATEGORY_ORDER[b.title] ?? 100
        return orderA - orderB
      })
  }, [shortcuts, activeContext])

  const isTreeContext = activeContext === 'builder-tree' || context === 'builder-tree'
  const hasShortcuts = shortcutSections.length > 0

  return (
    <>
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {isTreeContext
            ? 'Shortcuts for building and editing your tree structure'
            : <>Press <KeyButton keyText="?" /> to show this again</>
          }
        </p>
      </div>

      {/* Shortcuts List */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-4 space-y-6">
          {!hasShortcuts ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Loading shortcuts...
              </p>
            </div>
          ) : (
            shortcutSections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                {/* Section Header */}
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {section.title}
                </h3>

                {/* Shortcuts in this section */}
                <div className="space-y-3">
                  {section.shortcuts.map((shortcut, shortcutIdx) => (
                    <div key={shortcutIdx}>
                      <div className="flex items-center justify-between gap-4 py-1">
                        <span className="text-sm text-foreground flex-1">
                          {shortcut.action}
                        </span>
                        <div className="flex items-center gap-2">
                          <ShortcutKeys keys={shortcut.keys} />
                          {shortcut.alternative && (
                            <>
                              <span className="text-xs text-muted-foreground">or</span>
                              <ShortcutKeys keys={shortcut.alternative} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Separator between sections (except last) */}
                {sectionIdx < shortcutSections.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  )
}
