'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Play, Square, Trash2, AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { UrlSuccessPath, UrlPathStep } from '@/stores/study-builder/live-website-builder'
import { autoDetectWildcardSegments, extractQueryParams, autoDetectWildcardParams } from '@/lib/utils/pathname-wildcard'
import { UrlPathStepsList } from './url-path-steps-list'
import { UrlPathAdvancedSettings } from './url-path-advanced-settings'

interface UrlPathRecorderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  websiteUrl: string
  startUrl?: string
  initialPath: UrlSuccessPath | null
  onSave: (path: UrlSuccessPath) => void
  trackingMode?: 'snippet' | 'reverse_proxy' | 'url_only'
  studyId?: string
  snippetId?: string | null
}

export function UrlPathRecorder({
  open,
  onOpenChange,
  websiteUrl,
  startUrl,
  initialPath,
  onSave,
  trackingMode,
  studyId,
  snippetId,
}: UrlPathRecorderProps) {
  const [steps, setSteps] = useState<UrlPathStep[]>(initialPath?.steps ?? [])
  const [isRecording, setIsRecording] = useState(false)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(new Set())
  const [groupHintDismissed, setGroupHintDismissed] = useState(false)
  const popupRef = useRef<Window | null>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSteps(initialPath?.steps ?? []) // eslint-disable-line react-hooks/set-state-in-effect
      setIsRecording(false)
      setPopupBlocked(false)
      setIsSelectMode(false)
      setSelectedStepIds(new Set())
      setGroupHintDismissed(false)
      popupRef.current = null
    }
  }, [open, initialPath])

  // Listen for postMessage events from the recording popup
  useEffect(() => {
    if (!open) return

    function handleMessage(event: MessageEvent) {
      if (!event.data) return

      // Handle done recording message from the popup
      if (event.data.type === 'veritio-lwt-done') {
        setIsRecording(false)
        popupRef.current = null
        return
      }

      // Handle restart recording — clear all steps
      if (event.data.type === 'veritio-lwt-restart') {
        setSteps([])
        return
      }

      // Handle group updates from the recording popup
      if (event.data.type === 'veritio-lwt-groups') {
        const groups = event.data.groups as (string | null)[]
        setSteps(prev => prev.map((s, i) => ({
          ...s,
          group: (groups[i] as string | undefined) || undefined,
        })))
        return
      }

      if (event.data.type !== 'veritio-lwt-nav') return

      const data = event.data as {
        pathname: string
        fullUrl: string
        title: string
        stepType?: 'navigation' | 'click'
        selector?: string
        elementText?: string
        label?: string
        insertAt?: number
        group?: string
      }

      const stepType = data.stepType || 'navigation'

      // Strip the __veritio_record param — it's a recording flag, not part of the real URL
      let cleanFullUrl = data.fullUrl
      let cleanPathname = data.pathname
      try {
        const u = new URL(cleanFullUrl)
        u.searchParams.delete('__veritio_record')
        cleanFullUrl = u.toString()
        cleanPathname = u.pathname + u.search + u.hash
      } catch { /* keep originals */ }

      setSteps((prev) => {
        // Deduplicate consecutive same-pathname navigation steps only
        if (stepType === 'navigation' && prev.length > 0) {
          const last = prev[prev.length - 1]
          if (last.type === 'navigation' && last.pathname === cleanPathname) {
            return prev
          }
        }

        const newStep: UrlPathStep = {
          id: crypto.randomUUID(),
          type: stepType,
          pathname: cleanPathname,
          fullUrl: cleanFullUrl,
          label: data.label || data.title || cleanPathname,
          selector: data.selector || undefined,
          elementText: data.elementText || undefined,
          group: data.group || undefined,
        }

        // Insert at specified position (for clicks confirmed after navigating away)
        if (typeof data.insertAt === 'number' && data.insertAt >= 0 && data.insertAt < prev.length) {
          const updated = [...prev]
          updated.splice(data.insertAt, 0, newStep)
          return updated
        }

        return [...prev, newStep]
      })
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [open])

  // Clean up popup on unmount or close
  useEffect(() => {
    if (!open && popupRef.current && !popupRef.current.closed) {
      popupRef.current.close()
      popupRef.current = null
    }
  }, [open])

  const handleStartRecording = useCallback(() => {
    // Use the task's starting page if set, otherwise fall back to the global website URL
    const targetUrl = startUrl || websiteUrl
    if (!targetUrl) return

    let recordingUrl: string

    if (trackingMode === 'reverse_proxy' && studyId && snippetId) {
      // Reverse proxy mode: open through the proxy worker so the companion script handles recording
      try {
        const parsed = new URL(targetUrl)
        const origin = parsed.origin
        const path = parsed.pathname + parsed.search
        const b64Origin = btoa(origin)
        const proxyWorkerUrl = process.env.NEXT_PUBLIC_PROXY_WORKER_URL || 'https://your-proxy-worker.workers.dev'
        const separator = path.includes('?') ? '&' : '?'
        recordingUrl = `${proxyWorkerUrl}/p/${studyId}/${snippetId}/${b64Origin}${path}${separator}__veritio_record=true`
      } catch {
        // Malformed URL — fall back to direct
        const url = new URL(targetUrl)
        url.searchParams.set('__veritio_record', 'true')
        recordingUrl = url.toString()
      }
    } else {
      // Snippet mode: open the website directly (snippet detects the recording param)
      const url = new URL(targetUrl)
      url.searchParams.set('__veritio_record', 'true')
      recordingUrl = url.toString()
    }

    const popup = window.open(recordingUrl, '_blank')
    if (!popup) {
      setPopupBlocked(true)
      return
    }

    popupRef.current = popup
    setPopupBlocked(false)
    setIsRecording(true)
    setSteps([])
    setIsSelectMode(false)
    setSelectedStepIds(new Set())
  }, [startUrl, websiteUrl, trackingMode, studyId, snippetId])

  const handleStopRecording = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close()
    }
    popupRef.current = null
    setIsRecording(false)
  }, [])

  const handleClearPath = useCallback(() => {
    setSteps([])
  }, [])

  const handleToggleWildcard = useCallback((stepId: string, segmentIndex: number) => {
    setSteps((prev) => prev.map((s) => {
      if (s.id !== stepId || s.type !== 'navigation') return s
      const current = s.wildcardSegments ?? autoDetectWildcardSegments(s.pathname)
      const next = current.includes(segmentIndex)
        ? current.filter((i) => i !== segmentIndex)
        : [...current, segmentIndex].sort((a, b) => a - b)
      return { ...s, wildcardSegments: next }
    }))
  }, [])

  const handleToggleWildcardParam = useCallback((stepId: string, paramKey: string) => {
    setSteps((prev) => prev.map((s) => {
      if (s.id !== stepId || s.type !== 'navigation') return s
      const current = s.wildcardParams ?? autoDetectWildcardParams(s.pathname)
      const next = current.includes(paramKey)
        ? current.filter((k) => k !== paramKey)
        : [...current, paramKey]
      return { ...s, wildcardParams: next }
    }))
  }, [])

  const handleCreateGroup = useCallback(() => {
    const indices = steps
      .map((s, i) => selectedStepIds.has(s.id) ? i : -1)
      .filter(i => i !== -1)
      .sort((a, b) => a - b)
    // Verify consecutive + not first/last
    if (indices.length < 2) return
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] !== indices[i - 1] + 1) return
    }
    if (indices.includes(0) || indices.includes(steps.length - 1)) return

    const groupId = crypto.randomUUID()
    setSteps(prev => prev.map((s) =>
      selectedStepIds.has(s.id) ? { ...s, group: groupId } : s
    ))
    setSelectedStepIds(new Set())
    setIsSelectMode(false)
  }, [selectedStepIds, steps])

  const handleUngroup = useCallback((groupId: string) => {
    setSteps(prev => prev.map(s =>
      s.group === groupId ? { ...s, group: undefined } : s
    ))
  }, [])

  // Auto-ungroup when a step deletion leaves a group with <=1 member
  const handleRemoveStepWithAutoUngroup = useCallback((id: string) => {
    setSteps(prev => {
      const step = prev.find(s => s.id === id)
      const filtered = prev.filter(s => s.id !== id)
      if (step?.group) {
        const remaining = filtered.filter(s => s.group === step.group)
        if (remaining.length <= 1) {
          return filtered.map(s =>
            s.group === step.group ? { ...s, group: undefined } : s
          )
        }
      }
      return filtered
    })
  }, [])

  // Check if selected steps are valid for grouping (consecutive, not first/last)
  const canCreateGroup = useMemo(() => {
    if (selectedStepIds.size < 2) return false
    const indices = steps
      .map((s, i) => selectedStepIds.has(s.id) ? i : -1)
      .filter(i => i !== -1)
      .sort((a, b) => a - b)
    if (indices.includes(0) || indices.includes(steps.length - 1)) return false
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] !== indices[i - 1] + 1) return false
    }
    // Don't allow grouping steps that are already in a group
    for (const idx of indices) {
      if (steps[idx].group) return false
    }
    return true
  }, [selectedStepIds, steps])

  const handleSave = useCallback(() => {
    if (steps.length < 2) return
    const stepsWithWildcards = steps.map((step) => {
      if (step.type !== 'navigation') return step
      const updated = { ...step }
      // Auto-detect path segment wildcards if not yet configured
      if (updated.wildcardSegments === undefined) {
        const detected = autoDetectWildcardSegments(step.pathname)
        if (detected.length > 0) updated.wildcardSegments = detected
      }
      // Auto-detect query param wildcards if not yet configured (default: all wildcarded)
      if (updated.wildcardParams === undefined) {
        const params = extractQueryParams(step.pathname)
        if (params.length > 0) updated.wildcardParams = params.map((p) => p.key)
      }
      return updated
    })
    onSave({
      version: 1,
      mode: 'strict',
      steps: stepsWithWildcards,
    })
    onOpenChange(false)
  }, [steps, onSave, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record URL Path</DialogTitle>
          <DialogDescription>
            Navigate through the website to record the expected path. Page visits are auto-added.
            Click <strong className="text-foreground">Add</strong> on detected interactions to include them — you can then mark steps as completable in any order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recording controls */}
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <Button
                variant="secondary"
                onClick={handleStartRecording}
                disabled={!startUrl && !websiteUrl}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleStopRecording}>
                <Square className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            )}
            {steps.length > 0 && (
              <Button variant="ghost" onClick={handleClearPath}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Path
              </Button>
            )}
            {isRecording && (
              <span className="flex items-center gap-1.5 text-xs text-destructive ml-auto">
                <Circle className="h-2.5 w-2.5 fill-current animate-pulse" />
                Recording...
              </span>
            )}
          </div>

          {/* Popup blocked warning */}
          {popupBlocked && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Popup blocked</p>
                <p className="text-xs mt-0.5">
                  Your browser blocked the popup window. Please allow popups for this site and try again.
                </p>
              </div>
            </div>
          )}

          {/* No website URL warning */}
          {!startUrl && !websiteUrl && (
            <p className="text-xs text-muted-foreground">
              Set a starting page or website URL before recording a path.
            </p>
          )}

          {/* Steps list */}
          {steps.length > 0 && (
            <UrlPathStepsList
              steps={steps}
              isRecording={isRecording}
              isSelectMode={isSelectMode}
              selectedStepIds={selectedStepIds}
              groupHintDismissed={groupHintDismissed}
              canCreateGroup={canCreateGroup}
              onSetIsSelectMode={setIsSelectMode}
              onSetSelectedStepIds={setSelectedStepIds}
              onSetGroupHintDismissed={setGroupHintDismissed}
              onCreateGroup={handleCreateGroup}
              onUngroup={handleUngroup}
              onRemoveStep={handleRemoveStepWithAutoUngroup}
            />
          )}

          {steps.length === 0 && !isRecording && (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Click &quot;Start Recording&quot; to open your website and begin navigating.
              Pages are auto-added. Use the + button on interactions to include them.
            </div>
          )}

          {steps.length === 1 && (
            <p className="text-xs text-amber-600">
              At least 2 steps are required (start and goal).
            </p>
          )}

          {steps.length >= 2 && steps.length <= 3 && !isRecording && (
            <div className="flex items-start gap-2 rounded-md border border-muted bg-muted/30 px-3 py-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Only navigations are auto-added. To require specific clicks or actions,
                record again and click <strong className="text-foreground">Add</strong> on the interactions you want to track.
                You can then mark some steps as completable in any order.
              </p>
            </div>
          )}

          {/* Advanced settings — collapsed by default */}
          {steps.length >= 2 && !isRecording && (
            <UrlPathAdvancedSettings
              steps={steps}
              onToggleWildcard={handleToggleWildcard}
              onToggleWildcardParam={handleToggleWildcardParam}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={steps.length < 2}>
            Save Path
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
