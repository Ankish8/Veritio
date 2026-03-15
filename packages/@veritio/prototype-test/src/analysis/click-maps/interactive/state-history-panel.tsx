'use client'

import { memo } from 'react'
import { X, MousePointerClick, History, Check } from 'lucide-react'
import { cn } from '@veritio/ui'
import { Button } from '@veritio/ui/components/button'
import { Badge } from '@veritio/ui/components/badge'
import { ScrollArea } from '@veritio/ui/components/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@veritio/ui/components/sheet'
import type { RecordedState } from './hooks/use-interactive-heatmap-state'

interface StateHistoryPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recordedStates: RecordedState[]
  activeStateKey: string | null
  frameThumbnailUrl?: string | null
  frameName?: string | null
  onStateSelect: (stateKey: string) => void
  className?: string
}
export const StateHistoryPanel = memo(function StateHistoryPanel({
  open,
  onOpenChange,
  recordedStates,
  activeStateKey,
  frameThumbnailUrl,
  frameName,
  onStateSelect,
}: StateHistoryPanelProps) {
  const totalClicks = recordedStates.reduce((sum, s) => sum + s.clickCount, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[360px] sm:w-[420px] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <SheetTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  State History
                </SheetTitle>
                {frameName && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {frameName}
                  </p>
                )}
              </div>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>

          {/* Summary */}
          <div className="px-6 py-3 bg-muted/30 border-b">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {recordedStates.length} unique state{recordedStates.length !== 1 ? 's' : ''} recorded
              </span>
              <span className="font-medium">
                {totalClicks} total click{totalClicks !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* State List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {recordedStates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No states recorded</p>
                  <p className="text-sm mt-1">
                    Navigate the prototype to see click data for different states.
                  </p>
                </div>
              ) : (
                recordedStates.map((state) => {
                  const isActive = state.stateKey === activeStateKey
                  const stateEntries = Object.entries(state.states)

                  return (
                    <button
                      key={state.stateKey}
                      onClick={() => onStateSelect(state.stateKey)}
                      className={cn(
                        'w-full text-left rounded-lg border p-3 transition-all hover:bg-muted/50',
                        isActive && 'ring-2 ring-primary border-primary bg-primary/5'
                      )}
                    >
                      <div className="flex gap-3">
                        {/* Thumbnail (per Q23) */}
                        {frameThumbnailUrl ? (
                          <div className="relative w-16 h-12 flex-shrink-0 rounded border overflow-hidden bg-muted">
                            <img
                              src={frameThumbnailUrl}
                              alt={state.label}
                              className="w-full h-full object-cover"
                            />
                            {/* State overlay indicator */}
                            {stateEntries.length > 0 && (
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            )}
                          </div>
                        ) : (
                          <div className="w-16 h-12 flex-shrink-0 rounded border bg-muted flex items-center justify-center">
                            <span className="text-[12px] text-muted-foreground">No preview</span>
                          </div>
                        )}

                        {/* State info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{state.label}</p>
                            {isActive && (
                              <Check className="w-4 h-4 text-primary flex-shrink-0" />
                            )}
                          </div>

                          {/* State badges */}
                          {stateEntries.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {stateEntries.slice(0, 3).map(([nodeId, variantId]) => (
                                <Badge
                                  key={nodeId}
                                  variant="outline"
                                  className="text-[12px] px-1.5 py-0"
                                >
                                  {variantId || nodeId.slice(-6)}
                                </Badge>
                              ))}
                              {stateEntries.length > 3 && (
                                <Badge variant="outline" className="text-[12px] px-1.5 py-0">
                                  +{stateEntries.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Click count */}
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <MousePointerClick className="w-3 h-3" />
                            <span>
                              {state.clickCount} click{state.clickCount !== 1 ? 's' : ''}
                            </span>
                            <span className="text-muted-foreground/70">
                              ({Math.round((state.clickCount / totalClicks) * 100)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>

          {/* Footer with help text */}
          <div className="px-6 py-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Click a state to filter the heatmap to only show clicks from that state.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
})

export default StateHistoryPanel
