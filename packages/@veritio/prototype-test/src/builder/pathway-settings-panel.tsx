'use client'

import { Image as ImageIcon, Info } from 'lucide-react'
import {
  Button,
  Input,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@veritio/ui'
import { generatePathName } from '../lib/utils/pathway-migration'
import type { PrototypeTestFrame } from '@veritio/study-types'
import type { PathMode } from './hooks/use-pathway-builder-state'

interface PathwaySettingsPanelProps {
  pathMode: PathMode
  setPathMode: (mode: PathMode) => void
  pathName: string
  setPathName: (name: string) => void
  trackComponentStates: boolean
  setTrackComponentStates: (track: boolean) => void
  hasPrototypeInteraction: boolean
  pathFrames: PrototypeTestFrame[]
  pathFrameIds: string[]
  pathStartFrame: PrototypeTestFrame | null
  openFrameSelector: (type: 'start' | 'goal') => void
  getFrameName: (id: string) => string
  portalContainer: HTMLElement | null
}

export function PathwaySettingsPanel({
  pathMode,
  setPathMode,
  pathName,
  setPathName,
  trackComponentStates,
  setTrackComponentStates,
  hasPrototypeInteraction,
  pathFrames,
  pathFrameIds,
  pathStartFrame,
  openFrameSelector,
  getFrameName,
  portalContainer,
}: PathwaySettingsPanelProps) {
  const hasGoalScreen = pathFrames.length >= 2
  const isTrackingLocked = hasGoalScreen || hasPrototypeInteraction

  return (
    <div className="w-80 border-l bg-background flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-foreground">Settings</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-5">
          {/* Starting Screen */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Starting screen
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="max-w-[240px] z-[200]"
                  portalContainer={portalContainer ?? undefined}
                >
                  <p className="text-xs">The screen where participants will begin the task. Click to change.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <button
              type="button"
              onClick={() => openFrameSelector('start')}
              className="w-full flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left group"
            >
              {/* Thumbnail */}
              <div className="w-16 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                {pathStartFrame?.thumbnail_url ? (
                  <img
                    src={pathStartFrame.thumbnail_url}
                    alt={pathStartFrame.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              {/* Frame name */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground block truncate">
                  {pathStartFrame?.name || 'Select screen'}
                </span>
                <span className="text-xs text-muted-foreground">Click to change</span>
              </div>
            </button>
          </div>

          {/* Success Criteria Type */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Success criteria
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="max-w-[240px] z-[200]"
                  portalContainer={portalContainer ?? undefined}
                >
                  <p className="text-xs">Choose how task success is measured. "Follow a Path" requires the exact sequence, while "Reach a Screen" allows any route to the goal.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <RadioGroup
              value={pathMode}
              onValueChange={(v) => setPathMode(v as PathMode)}
              className="space-y-2"
            >
              {/* Follow a Path - first/default */}
              <label
                htmlFor="strict"
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border',
                  pathMode === 'strict'
                    ? 'bg-muted/50 border-border'
                    : 'border-transparent hover:bg-muted/30'
                )}
              >
                <RadioGroupItem value="strict" id="strict" className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground block">Follow a Path</span>
                  <span className="text-xs text-muted-foreground leading-relaxed block mt-1">
                    Must follow the exact sequence of screens
                  </span>
                </div>
              </label>
              {/* Reach a Screen - second */}
              <label
                htmlFor="flexible"
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border',
                  pathMode === 'flexible'
                    ? 'bg-muted/50 border-border'
                    : 'border-transparent hover:bg-muted/30'
                )}
              >
                <RadioGroupItem value="flexible" id="flexible" className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground block">Reach a Screen</span>
                  <span className="text-xs text-muted-foreground leading-relaxed block mt-1">
                    Any route to the goal screen counts
                  </span>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Component States - Optional enhancement */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Component states
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="max-w-[240px] z-[200]"
                  portalContainer={portalContainer ?? undefined}
                >
                  <p className="text-xs">
                    Track interactions with tabs, toggles, accordions, and other interactive components in your prototype. Useful for single-page apps or complex interactions.
                    {isTrackingLocked && (
                      <span className="block mt-1 text-muted-foreground/80">
                        Clear the path to change this setting.
                      </span>
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <label
              htmlFor={isTrackingLocked ? undefined : 'track-states'}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg transition-all border',
                isTrackingLocked
                  ? 'opacity-60 cursor-not-allowed border-transparent'
                  : 'cursor-pointer',
                !isTrackingLocked && trackComponentStates
                  ? 'bg-muted/50 border-border'
                  : !isTrackingLocked
                    ? 'border-transparent hover:bg-muted/30'
                    : trackComponentStates
                      ? 'bg-muted/30 border-border/50'
                      : 'border-transparent'
              )}
            >
              <Checkbox
                id="track-states"
                checked={trackComponentStates}
                onCheckedChange={(checked) => {
                  if (!isTrackingLocked) {
                    setTrackComponentStates(checked === true)
                  }
                }}
                disabled={isTrackingLocked}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground block">
                  {pathMode === 'flexible' ? 'Require specific states' : 'Track interactions'}
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed block mt-1">
                  {pathMode === 'flexible'
                    ? 'Also require specific tab/toggle states on the goal screen'
                    : 'Record tab/toggle interactions along the path'
                  }
                </span>
                {isTrackingLocked && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed block mt-1.5">
                    Clear the path to change this setting
                  </span>
                )}
              </div>
            </label>
          </div>

          {/* Path name - show when path exists and in strict mode */}
          {pathFrames.length >= 2 && pathMode === 'strict' && (
            <div className="space-y-2 pt-3 border-t">
              <label htmlFor="pathName" className="text-xs font-medium text-muted-foreground">
                Path name (optional)
              </label>
              <Input
                id="pathName"
                value={pathName}
                onChange={(e) => setPathName(e.target.value)}
                placeholder={generatePathName(pathFrameIds, getFrameName)}
                className="h-9"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
