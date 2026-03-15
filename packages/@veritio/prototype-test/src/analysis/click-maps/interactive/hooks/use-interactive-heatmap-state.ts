import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

export interface ClickWithState {
  id: string
  frameId: string
  normalizedX: number
  normalizedY: number
  wasHotspot?: boolean
  timeSinceFrameLoadMs?: number
  participantId: string
  componentStates?: Record<string, string> | null
  timestamp: string
}

export type StateMatchingMode = 'exact' | 'partial'

export interface RecordedState {
  stateKey: string
  states: Record<string, string>
  clickCount: number
  frameId: string
  label: string
}

interface UseInteractiveHeatmapStateConfig {
  clicks: ClickWithState[]
  debounceMs?: number
}

interface UseInteractiveHeatmapStateReturn {
  currentFrameId: string | null
  currentStates: Record<string, string>
  matchingMode: StateMatchingMode
  filteredClicks: ClickWithState[]
  clickCount: number
  recordedStates: RecordedState[]
  setCurrentFrameId: (frameId: string | null) => void
  updateComponentState: (nodeId: string, variantId: string) => void
  setStateSnapshot: (states: Record<string, string>) => void
  toggleMatchingMode: () => void
  setMatchingMode: (mode: StateMatchingMode) => void
  jumpToState: (stateKey: string) => void
  clearState: () => void
}

function buildStateKey(states: Record<string, string> | null | undefined): string {
  if (!states || Object.keys(states).length === 0) return 'no-state'
  return Object.keys(states)
    .sort()
    .map(k => `${k}:${states[k]}`)
    .join('|')
}

function buildStateLabel(states: Record<string, string>): string {
  const entries = Object.entries(states)
  if (entries.length === 0) return 'Default state'
  if (entries.length === 1) {
    const [, variant] = entries[0]
    return variant || 'State 1'
  }
  if (entries.length <= 3) {
    return entries.map(([, v]) => v).join(', ')
  }
  return `${entries.length} states`
}

function filterClicksByState(
  clicks: ClickWithState[],
  frameId: string | null,
  currentStates: Record<string, string>,
  matchMode: StateMatchingMode
): ClickWithState[] {
  if (!frameId) return []

  return clicks.filter(click => {
    // Must match frame
    if (click.frameId !== frameId) return false

    const clickStates = click.componentStates || {}
    const currentStateKeys = Object.keys(currentStates)

    // If no current states to match, return all clicks for this frame
    if (currentStateKeys.length === 0) return true

    if (matchMode === 'exact') {
      // All current states must match exactly
      return currentStateKeys.every(
        nodeId => clickStates[nodeId] === currentStates[nodeId]
      )
    } else {
      // Partial: at least one state matches
      return currentStateKeys.some(
        nodeId => clickStates[nodeId] === currentStates[nodeId]
      )
    }
  })
}
export function useInteractiveHeatmapState({
  clicks,
  debounceMs = 150,
}: UseInteractiveHeatmapStateConfig): UseInteractiveHeatmapStateReturn {
  // Current frame from Figma navigation
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(null)

  // Current component states from Figma
  const [currentStates, setCurrentStates] = useState<Record<string, string>>({})

  // Matching mode (per Q5 - default to exact)
  const [matchingMode, setMatchingMode] = useState<StateMatchingMode>('exact')

  // Debounced filtered clicks
  const [filteredClicks, setFilteredClicks] = useState<ClickWithState[]>([])

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Update component state (from NEW_STATE event)
  const updateComponentState = useCallback((nodeId: string, variantId: string) => {
    setCurrentStates(prev => ({
      ...prev,
      [nodeId]: variantId,
    }))
  }, [])

  // Set full state snapshot (from stateMappings)
  const setStateSnapshot = useCallback((states: Record<string, string>) => {
    setCurrentStates(states)
  }, [])

  // Toggle matching mode
  const toggleMatchingMode = useCallback(() => {
    setMatchingMode(prev => prev === 'exact' ? 'partial' : 'exact')
  }, [])

  // Clear state
  const clearState = useCallback(() => {
    setCurrentStates({})
  }, [])

  // Debounced click filtering
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      const filtered = filterClicksByState(
        clicks,
        currentFrameId,
        currentStates,
        matchingMode
      )
      setFilteredClicks(filtered)
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [clicks, currentFrameId, currentStates, matchingMode, debounceMs])

  // Build recorded states for the current frame (for state history panel)
  const recordedStates = useMemo((): RecordedState[] => {
    if (!currentFrameId) return []

    // Group clicks by their state key
    const stateMap = new Map<string, { states: Record<string, string>; count: number }>()

    clicks
      .filter(c => c.frameId === currentFrameId)
      .forEach(click => {
        const states = click.componentStates || {}
        const key = buildStateKey(states)

        if (!stateMap.has(key)) {
          stateMap.set(key, { states, count: 0 })
        }
        stateMap.get(key)!.count++
      })

    // Convert to array and sort by click count
    return Array.from(stateMap.entries())
      .map(([stateKey, { states, count }]) => ({
        stateKey,
        states,
        clickCount: count,
        frameId: currentFrameId,
        label: buildStateLabel(states),
      }))
      .sort((a, b) => b.clickCount - a.clickCount)
  }, [clicks, currentFrameId])

  // Jump to a specific recorded state
  const jumpToState = useCallback((stateKey: string) => {
    const state = recordedStates.find(s => s.stateKey === stateKey)
    if (state) {
      setCurrentStates(state.states)
    }
  }, [recordedStates])

  return {
    currentFrameId,
    currentStates,
    matchingMode,
    filteredClicks,
    clickCount: filteredClicks.length,
    recordedStates,
    setCurrentFrameId,
    updateComponentState,
    setStateSnapshot,
    toggleMatchingMode,
    setMatchingMode,
    jumpToState,
    clearState,
  }
}
