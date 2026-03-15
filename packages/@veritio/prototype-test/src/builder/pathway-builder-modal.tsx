'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  TooltipProvider,
  useKeyboardShortcut,
  Dialog,
  DialogTitle,
  cn,
} from '@veritio/ui'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { FrameSelectorDialog } from './frame-selector-dialog'
import type { PrototypeTestPrototype, PrototypeTestFrame, PathwayStep } from '@veritio/study-types'
import { usePathwayBuilderState } from './hooks/use-pathway-builder-state'
import type { PathwayBuilderResult } from './hooks/use-pathway-builder-state'
import { PathwaySettingsPanel } from './pathway-settings-panel'
import { TrackingPromptDialog } from './tracking-prompt-dialog'
import { ModalHeader, PathStepsSidebar } from './pathway-steps-sidebar'

export type { PathwayBuilderResult }

interface PathwayBuilderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prototype: PrototypeTestPrototype
  frames: PrototypeTestFrame[]
  startFrameId?: string | null
  initialPath?: string[]
  initialSteps?: PathwayStep[]
  initialName?: string
  editingPathId?: string
  onSave: (result: PathwayBuilderResult) => void
}

export function PathwayBuilderModal({
  open,
  onOpenChange,
  prototype,
  frames,
  startFrameId,
  initialPath = [],
  initialSteps,
  initialName = '',
  editingPathId,
  onSave,
}: PathwayBuilderModalProps) {
  const {
    // State values
    isLoaded,
    pathMode,
    pathName,
    trackComponentStates,
    hasPrototypeInteraction,
    frameSelector,
    showTrackingPrompt,
    embedUrl,
    goalLockDisabled,

    // Derived values
    pathFrameIds,
    changedComponentsPerStep,
    pathFrames,
    pathStartFrame,
    pathGoalFrame,
    pathMiddleFrames,
    currentFrame,
    canSave,
    goalIsOverlay,
    shouldLockPreviewToGoal,
    selectableFrames,
    modalTitle,
    goalFrameForLock,
    goalBaseFrameNodeId,
    goalFrameNodeId,

    // Handler functions
    handleSave,
    handleClearPath,
    handleFrameSelect,
    handleIframeLoad,
    openFrameSelector,
    getFrameName,
    handleEnableTracking,

    // Utility callbacks
    getStepVariantInfo,
    getOverlaysForStep,
    getFrameDimensions,

    // From usePrototypeControls
    iframeRef,
    prototypeState,

    // Setter functions used in JSX
    setPathMode,
    setPathName,
    setTrackComponentStates,
    setFrameSelector,
    setShowTrackingPrompt,
    setShowOverlayHint,

    // Refs used in JSX onClick handlers
    trackingPromptDismissedRef,
  } = usePathwayBuilderState({
    open,
    onOpenChange,
    prototype,
    frames,
    startFrameId,
    initialPath,
    initialSteps,
    initialName,
    editingPathId,
    onSave,
  })

  // Keep body pointer-events enabled so hover tooltips work in React 19.
  useEffect(() => {
    if (!open) return

    const ensurePointerEvents = () => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = ''
      }
    }

    ensurePointerEvents()
    const timeoutId = setTimeout(ensurePointerEvents, 0)
    const observer = new MutationObserver(ensurePointerEvents)
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] })

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [open])

  // Delay applying display:none until after the fade-out animation completes.
  // This gives us smooth animation AND guarantees click-through afterwards.
  const [shouldHide, setShouldHide] = useState(!open)
  useEffect(() => {
    if (open) {
      setShouldHide(false)
    } else {
      const timer = setTimeout(() => setShouldHide(true), 160) // slightly > 150ms animation
      return () => clearTimeout(timer)
    }
  }, [open])

  useKeyboardShortcut({
    enabled: open && canSave,
    onCmdEnter: handleSave,
  })

  const dialogContentRef = useRef<HTMLDivElement | null>(null)
  const saveTooltip = !canSave
    ? goalIsOverlay
      ? 'Overlays cannot be goal screens. Click through to reach the underlying screen.'
      : pathFrameIds.length < 2
        ? 'Path must have at least 2 screens'
        : 'Cannot save path'
    : null

  return (
    <TooltipProvider delayDuration={300}>
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogPrimitive.Portal forceMount>
        {/* Custom overlay with high z-index — fades out then hides when dialog is closed */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[100] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-150",
            !open && "opacity-0",
            shouldHide && "hidden"
          )}
          forceMount
        />
        {/* Full-screen content — fades out then hides when closed, stays mounted to keep iframe alive */}
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-150",
            !open && "opacity-0",
            shouldHide && "invisible"
          )}
          ref={dialogContentRef}
          style={{ pointerEvents: open ? 'auto' : 'none' }}
          forceMount
          onPointerDownOutside={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {/* Visually hidden title for screen readers */}
          <VisuallyHidden>
            <DialogTitle>{modalTitle}</DialogTitle>
          </VisuallyHidden>

        {/* Header */}
        <ModalHeader
          modalTitle={modalTitle}
          canSave={canSave}
          saveTooltip={saveTooltip}
          onClose={() => onOpenChange(false)}
          onSave={handleSave}
          portalContainer={dialogContentRef.current}
        />

        {/* Main content - 3 column layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left sidebar - Path steps */}
          <PathStepsSidebar
            pathFrames={pathFrames}
            pathStartFrame={pathStartFrame}
            pathGoalFrame={pathGoalFrame}
            pathMiddleFrames={pathMiddleFrames}
            pathFrameIds={pathFrameIds}
            pathMode={pathMode}
            currentFrame={currentFrame ?? null}
            trackComponentStates={trackComponentStates}
            changedComponentsPerStep={changedComponentsPerStep}
            handleClearPath={handleClearPath}
            openFrameSelector={openFrameSelector}
            getStepVariantInfo={getStepVariantInfo}
            getOverlaysForStep={getOverlaysForStep}
            getFrameDimensions={getFrameDimensions}
          />

          {/* Prototype area - center */}
          <div className="flex-1 relative bg-stone-100">
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-stone-500">Loading prototype...</p>
                </div>
              </div>
            )}

            {embedUrl ? (
              <iframe
                ref={iframeRef}
                src={embedUrl}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                allowFullScreen
                loading="eager"
                allow="clipboard-write"
                title="Figma Prototype"
              />
            ) : prototype.figma_url ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-stone-500">Preparing prototype...</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-stone-500">No prototype URL configured</p>
              </div>
            )}

            {/* Floating instruction - only when no path yet */}
            {isLoaded && pathFrames.length === 0 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-5 py-2.5 rounded-full text-sm shadow-lg">
                Click through your prototype to build the path
              </div>
            )}
          </div>

          {/* Right sidebar - Settings panel */}
          <PathwaySettingsPanel
            pathMode={pathMode}
            setPathMode={setPathMode}
            pathName={pathName}
            setPathName={setPathName}
            trackComponentStates={trackComponentStates}
            setTrackComponentStates={setTrackComponentStates}
            hasPrototypeInteraction={hasPrototypeInteraction}
            pathFrames={pathFrames}
            pathFrameIds={pathFrameIds}
            pathStartFrame={pathStartFrame}
            openFrameSelector={openFrameSelector}
            getFrameName={(id) => getFrameName(id) ?? ''}
            portalContainer={dialogContentRef.current}
          />
        </div>

        {/* Frame selector */}
        <FrameSelectorDialog
          open={frameSelector.open}
          onOpenChange={(open) => setFrameSelector(prev => ({ ...prev, open }))}
          frames={selectableFrames}
          selectedFrameIds={
            frameSelector.type === 'start'
              ? pathFrameIds.length > 0 ? [pathFrameIds[0]] : []
              : pathFrameIds.length > 1 ? [pathFrameIds[pathFrameIds.length - 1]] : []
          }
          onSelect={handleFrameSelect}
          mode="single"
          title={frameSelector.type === 'start' ? 'Select start screen' : 'Select goal screen'}
          description={
            frameSelector.type === 'start'
              ? 'Choose which screen participants will start from'
              : 'Choose which screen participants need to reach'
          }
        />

          {/* Component tracking prompt */}
          {showTrackingPrompt && (
            <TrackingPromptDialog
              pathMode={pathMode}
              onDismiss={() => {
                trackingPromptDismissedRef.current = true
                setShowTrackingPrompt(false)
              }}
              onEnable={handleEnableTracking}
            />
          )}

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
    </TooltipProvider>
  )
}

