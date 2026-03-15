'use client'

import { useState } from 'react'
import { Flag, Route, HelpCircle, Layers } from 'lucide-react'
import { cn, Label, Badge, Switch } from '@veritio/ui'
import type { SuccessCriteriaType } from './add-correct-answer-modal'
import type { PrototypeTestPrototype } from '@veritio/study-types'
import type { ComponentStateSuccessCriteria } from '@veritio/study-types/study-flow-types'
import { StateSuccessCriteria, type StateSuccessCriteriaConfig } from './state-success-criteria'
import { SuccessCriteriaGuidance } from './success-criteria-guidance'

interface SuccessCriteriaSelectorProps {
  value: SuccessCriteriaType | null
  onChange: (type: SuccessCriteriaType) => void
  onSelectDestination: () => void
  onSelectPathway: () => void
  hasDestination: boolean
  hasPathway: boolean
  destinationPreview?: React.ReactNode
  pathwayPreview?: React.ReactNode
  enableInteractiveComponents?: boolean
  successComponentStates?: ComponentStateSuccessCriteria[]
  prototype?: PrototypeTestPrototype | null
  targetFrameNodeId?: string | null
  onCaptureComponentStates?: (states: ComponentStateSuccessCriteria[]) => void
  stateSuccessCriteria?: StateSuccessCriteriaConfig | null
  onStateSuccessCriteriaChange?: (config: StateSuccessCriteriaConfig) => void
  startFrameId?: string | null
  requireComponentStates?: boolean
  onRequireComponentStatesChange?: (enabled: boolean) => void
}

export function SuccessCriteriaSelector({
  value,
  onChange,
  onSelectDestination,
  onSelectPathway,
  hasDestination,
  hasPathway,
  destinationPreview,
  pathwayPreview,
  enableInteractiveComponents = false,
  successComponentStates = [],
  prototype,
  targetFrameNodeId,
  onCaptureComponentStates,
  stateSuccessCriteria,
  onStateSuccessCriteriaChange,
  startFrameId,
  requireComponentStates = false,
  onRequireComponentStatesChange,
}: SuccessCriteriaSelectorProps) {
  const isDestinationSelected = value === 'destination'
  const isPathwaySelected = value === 'pathway'
  const [showGuidance, setShowGuidance] = useState(false)

  // Show configured state when criteria is selected AND has content
  const showDestinationConfigured = isDestinationSelected && hasDestination
  const showPathwayConfigured = isPathwaySelected && hasPathway
  const hasComponentStateConfig = (stateSuccessCriteria?.states?.length ?? 0) > 0

  // Show component state option inside destination when:
  // - Destination is selected AND configured
  // - Interactive components are enabled
  const showComponentStateOption = showDestinationConfigured && enableInteractiveComponents

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Success Criteria</Label>
        <button
          type="button"
          onClick={() => setShowGuidance(true)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <HelpCircle className="w-3 h-3" />
          Which should I use?
        </button>
      </div>

      {/* Card grid - 2 columns, wraps to third */}
      <div className="grid grid-cols-2 gap-3">
        {/* Reach a specific screen card */}
        <button
          type="button"
          onClick={() => {
            onChange('destination')
            onSelectDestination()
          }}
          className={cn(
            'relative flex flex-col rounded-lg border transition-all group overflow-hidden',
            showDestinationConfigured
              ? 'border-border bg-muted/20 hover:bg-muted/30'
              : cn(
                  'items-center justify-center gap-3 p-5 min-h-[160px] text-center',
                  isDestinationSelected
                    ? 'border-foreground/20 bg-muted/40'
                    : 'border-border hover:border-foreground/20 hover:bg-muted/30'
                )
          )}
        >
          {showDestinationConfigured ? (
            /* Configured state - Clean minimal preview */
            <>
              {/* Minimal header */}
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[12px] font-medium text-muted-foreground/70 uppercase tracking-wider">Destination</span>
                <span className="text-[12px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                  Edit
                </span>
              </div>
              {/* Preview area - tight padding */}
              <div className="px-2 pb-2">
                {destinationPreview}
              </div>
            </>
          ) : (
            /* Default unconfigured state */
            <>
              {/* Icon container */}
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                  isDestinationSelected
                    ? 'bg-primary/10'
                    : 'bg-muted group-hover:bg-muted-foreground/10'
                )}
              >
                <Flag
                  className={cn(
                    'h-6 w-6',
                    isDestinationSelected
                      ? 'text-primary'
                      : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
              </div>

              {/* Title and description */}
              <div className="space-y-1">
                <p className={cn(
                  'text-sm font-medium leading-tight',
                  isDestinationSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                )}>
                  Reach a screen
                </p>
                <p className="text-xs text-muted-foreground leading-snug">
                  Task completes when participant reaches any goal screen
                </p>
              </div>
            </>
          )}
        </button>

        {/* Follow an exact path card */}
        <button
          type="button"
          onClick={() => {
            onChange('pathway')
            onSelectPathway()
          }}
          className={cn(
            'relative flex flex-col rounded-lg border transition-all group overflow-hidden',
            showPathwayConfigured
              ? 'border-border bg-muted/20 hover:bg-muted/30'
              : cn(
                  'items-center justify-center gap-3 p-5 min-h-[160px] text-center',
                  isPathwaySelected
                    ? 'border-foreground/20 bg-muted/40'
                    : 'border-border hover:border-foreground/20 hover:bg-muted/30'
                )
          )}
        >
          {showPathwayConfigured ? (
            /* Configured state - Large carousel preview */
            <>
              {/* Minimal header */}
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[12px] font-medium text-muted-foreground/70 uppercase tracking-wider">Path</span>
                <span className="text-[12px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                  Edit
                </span>
              </div>
              {/* Carousel preview area - tight padding */}
              <div className="px-2 pb-2">
                {pathwayPreview}
              </div>
            </>
          ) : (
            /* Default unconfigured state */
            <>
              {/* Icon container */}
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                  isPathwaySelected
                    ? 'bg-primary/10'
                    : 'bg-muted group-hover:bg-muted-foreground/10'
                )}
              >
                <Route
                  className={cn(
                    'h-6 w-6',
                    isPathwaySelected
                      ? 'text-primary'
                      : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
              </div>

              {/* Title and description */}
              <div className="space-y-1">
                <p className={cn(
                  'text-sm font-medium leading-tight',
                  isPathwaySelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                )}>
                  Follow a path
                </p>
                <p className="text-xs text-muted-foreground leading-snug">
                  Task completes when participant follows the exact sequence
                </p>
              </div>
            </>
          )}
        </button>

      </div>

      {/* Component State Requirements (integrated into destination) */}
      {showComponentStateOption && onStateSuccessCriteriaChange && (
        <div className="mt-3 p-3 border rounded-lg bg-muted/30">
          {/* Toggle header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <div>
                <p className="text-sm font-medium">Require specific component states</p>
                <p className="text-xs text-muted-foreground">
                  Task only succeeds if specific tabs, toggles, or variants are active
                </p>
              </div>
            </div>
            <Switch
              checked={requireComponentStates}
              onCheckedChange={onRequireComponentStatesChange}
            />
          </div>

          {/* StateSuccessCriteria when enabled */}
          {requireComponentStates && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <StateSuccessCriteria
                value={stateSuccessCriteria || null}
                onChange={onStateSuccessCriteriaChange}
                prototype={prototype || null}
                startFrameId={targetFrameNodeId || null}
              />
            </div>
          )}

          {/* Summary badges when collapsed but has states */}
          {!requireComponentStates && hasComponentStateConfig && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground mr-1">Configured:</span>
              {stateSuccessCriteria?.states?.slice(0, 3).map((state, index) => (
                <Badge
                  key={`${state.componentNodeId}-${index}`}
                  variant="outline"
                  className="text-xs"
                >
                  {state.variantName || `State ${index + 1}`}
                </Badge>
              ))}
              {(stateSuccessCriteria?.states?.length ?? 0) > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{(stateSuccessCriteria?.states?.length ?? 0) - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Success Criteria Guidance Dialog */}
      <SuccessCriteriaGuidance
        open={showGuidance}
        onOpenChange={setShowGuidance}
      />
    </div>
  )
}
