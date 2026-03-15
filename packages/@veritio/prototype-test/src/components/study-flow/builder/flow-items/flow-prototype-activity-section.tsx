'use client'

import { useState } from 'react'
import { ChevronDown, Info, Layers } from 'lucide-react'
import { Switch } from '@veritio/ui/components/switch'
import { cn } from '@veritio/ui'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@veritio/ui/components/collapsible'

interface FlowPrototypeActivitySectionProps {
  isInstructionsActive: boolean
  isPrototypeSettingsActive: boolean
  instructionsEnabled: boolean
  taskCount: number
  onSelectInstructions: () => void
  onSelectPrototype: () => void
  onToggleInstructions: () => void
}
export function FlowPrototypeActivitySection({
  isInstructionsActive,
  isPrototypeSettingsActive,
  instructionsEnabled,
  taskCount,
  onSelectInstructions,
  onSelectPrototype,
  onToggleInstructions,
}: FlowPrototypeActivitySectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const isAnyActive = isInstructionsActive || isPrototypeSettingsActive

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'rounded-lg border transition-all',
          'bg-primary/[0.03] border-primary/30',
          isAnyActive && 'ring-1 ring-primary/20'
        )}
      >
        {/* Collapsible Header */}
        <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-primary/5 rounded-t-lg">
          <div className="flex items-center gap-2">
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform shrink-0 self-start mt-0.5',
                isOpen && 'rotate-180'
              )}
            />
            <div className="flex-1 min-w-0 text-left">
              <span className="text-sm font-medium text-foreground block">
                Prototype test
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure prototype and tasks
              </p>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-2 pb-2 space-y-1">
            {/* Instructions Item */}
            <div
              role="button"
              tabIndex={0}
              onClick={onSelectInstructions}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectInstructions()
                }
              }}
              className={cn(
                'w-full text-left rounded-md px-3 py-2.5 transition-all cursor-pointer',
                isInstructionsActive
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted/50 border border-transparent'
              )}
              aria-current={isInstructionsActive ? 'step' : undefined}
            >
              <div className="flex items-center justify-between gap-3">
                <div className={cn(
                  'flex items-center gap-3 flex-1 min-w-0',
                  !instructionsEnabled && 'opacity-50'
                )}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background border border-border shrink-0">
                    <Info className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block text-foreground">
                      Instructions
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Instructions
                    </p>
                  </div>
                </div>
                <Switch
                  checked={instructionsEnabled}
                  onCheckedChange={onToggleInstructions}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Toggle instructions"
                  className="shrink-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Prototype Test Item */}
            <div
              role="button"
              tabIndex={0}
              onClick={onSelectPrototype}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectPrototype()
                }
              }}
              className={cn(
                'w-full text-left rounded-md px-3 py-2.5 transition-all cursor-pointer',
                isPrototypeSettingsActive
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted/50 border border-transparent'
              )}
              aria-current={isPrototypeSettingsActive ? 'step' : undefined}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background border border-border shrink-0">
                  <Layers className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block text-foreground">
                    Prototype test
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
