'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Input,
  Label,
  cn,
} from '@veritio/ui'
import { FigmaEmbed } from '@veritio/prototype-test/player'
import type { PrototypeTestPrototype } from '@veritio/study-types'
import type {
  ComponentStateSnapshot,
  ComponentStateSuccessCriteria,
  ComponentStateEvent,
} from '@veritio/study-types/study-flow-types'

interface StateCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prototype: PrototypeTestPrototype
  targetFrameNodeId: string
  currentStates: ComponentStateSuccessCriteria[]
  onCapture: (states: ComponentStateSuccessCriteria[]) => void
}
interface StateWithLabel {
  componentNodeId: string
  variantId: string
  customLabel: string
  isEditing: boolean
}
function generateDefaultLabel(index: number, variantId: string): string {
  // If variantId looks like a readable name, use it
  const isReadableName = /^[a-zA-Z][a-zA-Z0-9\s_-]*$/.test(variantId) && variantId.length < 30
  if (isReadableName) {
    return variantId.replace(/[-_]/g, ' ')
  }
  return `State ${index + 1}`
}

export function StateCaptureDialog({
  open,
  onOpenChange,
  prototype,
  targetFrameNodeId,
  currentStates,
  onCapture,
}: StateCaptureDialogProps) {
  // Track raw captured states from Figma
  const [capturedStates, setCapturedStates] = useState<ComponentStateSnapshot>({})

  // Handle individual component state changes (NEW_STATE events)
  // This is called when user clicks tabs, toggles, etc. in the prototype
  const handleStateChange = useCallback((event: ComponentStateEvent) => {
    setCapturedStates(prev => ({
      ...prev,
      [event.nodeId]: event.toVariantId
    }))
  }, [])

  // Track custom labels for each captured state
  const [stateLabels, setStateLabels] = useState<StateWithLabel[]>([])

  // Build current state map from existing states (for initialization)
  const currentStateMap = useMemo<ComponentStateSnapshot>(() => {
    return currentStates.reduce<ComponentStateSnapshot>((acc, state) => {
      acc[state.componentNodeId] = state.variantId
      return acc
    }, {})
  }, [currentStates])

  // Build label map from existing states (to preserve custom labels)
  const existingLabelMap = useMemo(() => {
    return new Map(
      currentStates.map(state => [
        `${state.componentNodeId}:${state.variantId}`,
        state.variantName || ''
      ])
    )
  }, [currentStates])

  // Initialize states when dialog opens - start with ONLY existing saved states
  // Don't populate from snapshot (which contains ALL component states on the frame)
  useEffect(() => {
    if (open) {
      // Only initialize with previously saved states, not the frame snapshot
      setCapturedStates(currentStateMap)

      // Initialize labels from existing saved states only
      const initialLabels: StateWithLabel[] = currentStates.map((state, index) => ({
        componentNodeId: state.componentNodeId,
        variantId: state.variantId,
        customLabel: state.variantName || generateDefaultLabel(index, state.variantId),
        isEditing: false,
      }))
      setStateLabels(initialLabels)
    }
  }, [open, currentStateMap, currentStates])

  // Sync labels when captured states change
  useEffect(() => {
    if (!open) return

    const entries = Object.entries(capturedStates)
    const newLabels: StateWithLabel[] = entries.map(([componentNodeId, variantId], index) => {
      // Check if we have an existing label for this exact state
      const key = `${componentNodeId}:${variantId}`
      const existingLabel = existingLabelMap.get(key)

      // Check if this state was already in our labels list (preserve editing state)
      const existingStateLabel = stateLabels.find(
        s => s.componentNodeId === componentNodeId && s.variantId === variantId
      )

      return {
        componentNodeId,
        variantId,
        customLabel: existingStateLabel?.customLabel || existingLabel || generateDefaultLabel(index, variantId),
        isEditing: existingStateLabel?.isEditing || false,
      }
    })

    // Only update if there's a real change (avoid infinite loops)
    const hasChanges =
      newLabels.length !== stateLabels.length ||
      newLabels.some((l, i) =>
        l.componentNodeId !== stateLabels[i]?.componentNodeId ||
        l.variantId !== stateLabels[i]?.variantId
      )

    if (hasChanges) {
      setStateLabels(newLabels)
    }
  }, [capturedStates, open, existingLabelMap]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLabelChange = useCallback((index: number, newLabel: string) => {
    setStateLabels(prev => prev.map((state, i) =>
      i === index ? { ...state, customLabel: newLabel } : state
    ))
  }, [])

  const toggleEditing = useCallback((index: number) => {
    setStateLabels(prev => prev.map((state, i) =>
      i === index ? { ...state, isEditing: !state.isEditing } : state
    ))
  }, [])

  const removeState = useCallback((index: number) => {
    const stateToRemove = stateLabels[index]
    if (!stateToRemove) return

    // Remove from both capturedStates and labels
    setCapturedStates(prev => {
      const newStates = { ...prev }
      delete newStates[stateToRemove.componentNodeId]
      return newStates
    })
    setStateLabels(prev => prev.filter((_, i) => i !== index))
  }, [stateLabels])

  const handleCapture = () => {
    const criteria: ComponentStateSuccessCriteria[] = stateLabels.map(state => ({
      componentNodeId: state.componentNodeId,
      variantId: state.variantId,
      variantName: state.customLabel || undefined,
    }))

    onCapture(criteria)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Capture Component State</DialogTitle>
          <DialogDescription>
            Navigate to the desired state, then customize labels for analysis
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative min-h-0 bg-gray-50">
          <FigmaEmbed
            prototype={prototype}
            currentFrameId={targetFrameNodeId}
            showHotspotHints={true}
            scaleMode="fit"
            // NOTE: We intentionally don't use onStateSnapshot here because it dumps
            // ALL component states on the frame when it loads. We only want to capture
            // states that the user explicitly interacts with via onStateChange.
            onStateChange={handleStateChange}
          />
        </div>

        {/* Component States with Custom Labels */}
        <div className="px-6 py-4 bg-muted/50 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Captured Component States</Label>
            <span className="text-xs text-muted-foreground">
              Click a label to customize
            </span>
          </div>

          {stateLabels.length > 0 ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {stateLabels.map((state, index) => (
                <div
                  key={`${state.componentNodeId}-${state.variantId}`}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md border transition-colors',
                    state.isEditing
                      ? 'border-primary bg-background'
                      : 'border-transparent hover:bg-muted'
                  )}
                >
                  {/* State number indicator */}
                  <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center text-xs">
                    {index + 1}
                  </Badge>

                  {state.isEditing ? (
                    /* Editing mode - show input */
                    <Input
                      value={state.customLabel}
                      onChange={(e) => handleLabelChange(index, e.target.value)}
                      onBlur={() => toggleEditing(index)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') toggleEditing(index)
                      }}
                      className="flex-1 h-8"
                      autoFocus
                      placeholder="Enter custom label..."
                    />
                  ) : (
                    /* Display mode - show label as clickable badge */
                    <button
                      type="button"
                      onClick={() => toggleEditing(index)}
                      className="flex-1 flex items-center gap-2 text-left group"
                    >
                      <span className="text-sm font-medium">{state.customLabel}</span>
                      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}

                  {/* Preview of how it appears */}
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {state.variantId.slice(0, 8)}...
                  </Badge>

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeState(index)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Interact with components in the prototype to capture their states
              </p>
            </div>
          )}

          {/* Preview hint */}
          {stateLabels.length > 0 && (
            <p className="text-xs text-muted-foreground pt-2 border-t">
              💡 Labels appear in analysis results. Use descriptive names like "Tab: Settings" or "Toggle: On"
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCapture} disabled={stateLabels.length === 0}>
            Save {stateLabels.length > 0 ? `${stateLabels.length} State${stateLabels.length > 1 ? 's' : ''}` : 'States'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
