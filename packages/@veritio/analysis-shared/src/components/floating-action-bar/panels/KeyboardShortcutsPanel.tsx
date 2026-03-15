'use client'

import { ScrollArea } from '@veritio/ui/components/scroll-area'
import { Separator } from '@veritio/ui/components/separator'
import type { ShortcutsContext } from '../FloatingActionBarContext'

export interface ShortcutDisplayItem {
  action: string
  keys: string[][]
  alternative?: string[][]
}

export interface ShortcutSection {
  title: string
  shortcuts: ShortcutDisplayItem[]
}

interface KeyboardShortcutsPanelProps {
  onClose: () => void
  context?: ShortcutsContext
  shortcutSections: ShortcutSection[]
  activeContext?: string | null
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

export function KeyboardShortcutsPanel({ onClose: _onClose, context, shortcutSections, activeContext }: KeyboardShortcutsPanelProps) {
  // Determine the subtitle based on context
  const isTreeContext = activeContext === 'builder-tree' || context === 'builder-tree'
  const subtitle = isTreeContext
    ? 'Shortcuts for building and editing your tree structure'
    : 'Press ? to show this again'

  // Show empty state if no shortcuts registered
  const hasShortcuts = shortcutSections.length > 0

  return (
    <>
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {isTreeContext ? subtitle : (
            <>Press <KeyButton keyText="?" /> to show this again</>
          )}
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
