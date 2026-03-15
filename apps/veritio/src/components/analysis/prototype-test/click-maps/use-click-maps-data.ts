'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  useClickEvents,
  filterClicksByFrame,
  calculateClickStats,
  sortFrames,
} from '@/hooks'
import { useAuthFetch } from '@/hooks/use-auth-fetch'
import { exportElementToPNG, generateHeatmapFilename } from '@/lib/analytics'
import type { PrototypeTestTask, Participant, SuccessPathway } from '@veritio/study-types'
import { buildVariantLabelMap } from '../paths/paths-utils'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { PageVisitFilter, FrameSortOption, HeatmapSettings, SelectionSettings, ClickDisplayMode } from '@/types/analytics'
import { resolveParticipantDisplay, extractDemographicsFromMetadata } from '@/lib/utils/participant-display'

// Display modes for prototype test (excludes 'grid' which is only for first-click)
export type PrototypeDisplayMode = Exclude<ClickDisplayMode, 'grid'>

const MAX_STATE_LABELS = 3

/** Extract base component node ID from Figma instance IDs: "I359:12289;127:12142" → "359:12289" */
function extractBaseNodeId(nodeId: string): string | null {
  if (!nodeId.startsWith('I')) return null
  const semiIdx = nodeId.indexOf(';')
  return semiIdx >= 0 ? nodeId.slice(1, semiIdx) : nodeId.slice(1)
}

/** Resolve a readable label for a component node + variant pair. */
function resolveStateLabel(
  nodeId: string,
  variantId: string,
  labelMap: { labels: Map<string, string>; componentNames: Map<string, string> }
): string | null {
  const variantLabel = labelMap.labels.get(variantId)
  if (variantLabel) return variantLabel
  const componentLabel = labelMap.componentNames.get(nodeId)
  if (componentLabel) return componentLabel
  const baseId = extractBaseNodeId(nodeId)
  if (baseId) return labelMap.componentNames.get(baseId) || null
  return null
}

/** Filter component states to only pathway-relevant entries (ones we can label). */
function filterRelevantStates(
  states: Record<string, string>,
  labelMap: { labels: Map<string, string>; componentNames: Map<string, string> } | null
): Record<string, string> {
  if (!labelMap) return states
  const filtered: Record<string, string> = {}
  for (const [nodeId, variantId] of Object.entries(states)) {
    if (resolveStateLabel(nodeId, variantId, labelMap)) {
      filtered[nodeId] = variantId
    }
  }
  return filtered
}

function buildComponentStateKey(states?: Record<string, string> | null): string | null {
  if (!states || Object.keys(states).length === 0) return null
  const sortedEntries = Object.keys(states).sort().map(key => [key, states[key]])
  return JSON.stringify(Object.fromEntries(sortedEntries))
}

function formatComponentStates(
  states: Record<string, string>,
  labelMap: { labels: Map<string, string>; componentNames: Map<string, string> } | null
): string {
  const entries = Object.entries(states)
  if (entries.length === 0) return 'Default state'
  const seen = new Set<string>()
  const uniqueLabels: string[] = []
  for (const [nodeId, variantId] of entries) {
    let label: string | null = null
    if (labelMap) label = resolveStateLabel(nodeId, variantId, labelMap)
    if (!label) label = `${nodeId}: ${variantId}`
    if (!seen.has(label)) {
      seen.add(label)
      uniqueLabels.push(label)
    }
  }
  const shown = uniqueLabels.slice(0, MAX_STATE_LABELS)
  const remaining = uniqueLabels.length - shown.length
  return remaining > 0
    ? `${shown.join(', ')} +${remaining} more`
    : shown.join(', ')
}

interface UseClickMapsDataParams {
  studyId: string
  tasks: PrototypeTestTask[]
  participants: Participant[]
  displayMode: PrototypeDisplayMode
  heatmapSettings: HeatmapSettings
  selectionSettings: SelectionSettings
  displaySettings?: ParticipantDisplaySettings | null
}

export function useClickMapsData({
  studyId,
  tasks,
  participants,
  displayMode,
  heatmapSettings,
  selectionSettings,
  displaySettings,
}: UseClickMapsDataParams) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '')
  const [pageVisitFilter, setPageVisitFilter] = useState<PageVisitFilter>('all')
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('all')
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [frameSortBy, setFrameSortBy] = useState<FrameSortOption>('visits')

  const heatmapContainerRef = useRef<HTMLDivElement>(null)
  const authFetch = useAuthFetch()

  const { clicks, frames: frameStats, isLoading, error, refetch } = useClickEvents(studyId, {
    taskId: selectedTaskId || undefined,
    participantId: selectedParticipantId === 'all' ? undefined : selectedParticipantId,
    pageVisit: pageVisitFilter,
  })

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId), [tasks, selectedTaskId])

  const variantLabelMap = useMemo(() => {
    if (!selectedTask?.success_pathway) return null
    const pathway = selectedTask.success_pathway as SuccessPathway
    if (!pathway || typeof pathway === 'string' || Array.isArray(pathway)) return null
    return buildVariantLabelMap(pathway)
  }, [selectedTask])

  const stateOptions = useMemo(() => {
    const stateMap = new Map<string, Record<string, string>>()
    clicks.forEach((click) => {
      if (!click.componentStates) return
      const relevant = filterRelevantStates(click.componentStates, variantLabelMap)
      const key = buildComponentStateKey(relevant)
      if (key) {
        stateMap.set(key, relevant)
      }
    })

    return Array.from(stateMap.entries()).map(([value, states]) => ({
      value,
      label: formatComponentStates(states, variantLabelMap),
    }))
  }, [clicks, variantLabelMap])

  const stateFilteredClicks = useMemo(() => {
    if (stateFilter === 'all') return clicks
    return clicks.filter((click) => {
      const relevant = filterRelevantStates(click.componentStates ?? {}, variantLabelMap)
      return buildComponentStateKey(relevant) === stateFilter
    })
  }, [clicks, stateFilter, variantLabelMap])

  // Auto-select first frame with clicks, or starting screen
  useEffect(() => {
    if (!selectedFrameId && frameStats.length > 0) {
      const startingFrame = frameStats.find(f => f.isStartingScreen)
      if (startingFrame) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedFrameId(startingFrame.id)
      } else {
        const sorted = sortFrames(frameStats, 'visits')
         
        if (sorted[0]) setSelectedFrameId(sorted[0].id)
      }
    }
  }, [frameStats, selectedFrameId])

  const frameClicks = useMemo(() => {
    if (!selectedFrameId) return []
    return filterClicksByFrame(stateFilteredClicks, selectedFrameId)
  }, [stateFilteredClicks, selectedFrameId])

  const currentFilterSettings = displayMode === 'heatmap' ? heatmapSettings : selectionSettings

  const filteredFrameClicks = useMemo(() => {
    let result = frameClicks

    if (currentFilterSettings.showFirstClickOnly) {
      const seenParticipants = new Set<string>()
      result = result.filter((click) => {
        if (seenParticipants.has(click.participantId)) return false
        seenParticipants.add(click.participantId)
        return true
      })
    }

    if (currentFilterSettings.showHitsOnly) {
      result = result.filter((click) => click.wasHotspot === true)
    }

    if (currentFilterSettings.showMissesOnly) {
      result = result.filter((click) => click.wasHotspot === false)
    }

    return result
  }, [frameClicks, currentFilterSettings.showFirstClickOnly, currentFilterSettings.showHitsOnly, currentFilterSettings.showMissesOnly])

  const activeFilters = useMemo(() => {
    const filters: string[] = []
    if (currentFilterSettings.showFirstClickOnly) filters.push('First click only')
    if (currentFilterSettings.showHitsOnly) filters.push('Hits only')
    if (currentFilterSettings.showMissesOnly) filters.push('Misses only')
    return filters
  }, [currentFilterSettings.showFirstClickOnly, currentFilterSettings.showHitsOnly, currentFilterSettings.showMissesOnly])

  const frameClickStats = useMemo(() => calculateClickStats(filteredFrameClicks), [filteredFrameClicks])

  const selectedFrame = useMemo(() => {
    const frameStat = frameStats.find(f => f.id === selectedFrameId)
    if (!frameStat) return null
    return {
      id: frameStat.id,
      name: frameStat.name,
      thumbnail_url: frameStat.thumbnailUrl,
      width: frameStat.frameWidth || 1920,
      height: frameStat.frameHeight || 1080,
    }
  }, [frameStats, selectedFrameId])

  // Auto-refresh low-res thumbnails in the background
  const thumbnailRefreshAttemptedRef = useRef(new Set<string>())
  useEffect(() => {
    const frame = selectedFrame
    if (!frame?.thumbnail_url || !frame.width) return

    if (thumbnailRefreshAttemptedRef.current.has(frame.id)) return

    const img = new Image()
    img.onload = () => {
      if (img.naturalWidth < frame.width) {
        thumbnailRefreshAttemptedRef.current.add(frame.id)
        authFetch(`/api/studies/${studyId}/prototype/refresh-thumbnails`, {
          method: 'POST',
        })
          .then((res) => {
            if (res.ok) refetch()
          })
          .catch(() => {})
      }
    }
    img.src = frame.thumbnail_url
  }, [selectedFrame, studyId, authFetch, refetch])

  const participantOptions = useMemo(() => {
    const options: { value: string; label: string; secondaryLabel?: string }[] = [
      { value: 'all', label: 'All participants' },
    ]
    participants.forEach((p, index) => {
      const demographics = extractDemographicsFromMetadata(p.metadata)
      const display = resolveParticipantDisplay(displaySettings, {
        index: index + 1,
        demographics,
      })
      const label = display.secondary
        ? `${display.primary} (${display.secondary})`
        : display.primary
      options.push({ value: p.id, label, secondaryLabel: display.secondary ?? undefined })
    })
    return options
  }, [participants, displaySettings])

  const handleDownloadPNG = useCallback(async () => {
    if (!heatmapContainerRef.current || !selectedFrame) return

    const filename = generateHeatmapFilename(
      selectedFrame.name,
      selectedTask?.title || undefined
    )

    try {
      await exportElementToPNG(heatmapContainerRef.current, filename)
    } catch {
      // Silent fail - export is a nice-to-have feature
    }
  }, [selectedFrame, selectedTask])

  return {
    // State
    selectedTaskId,
    setSelectedTaskId,
    pageVisitFilter,
    setPageVisitFilter,
    selectedParticipantId,
    setSelectedParticipantId,
    stateFilter,
    setStateFilter,
    selectedFrameId,
    setSelectedFrameId,
    frameSortBy,
    setFrameSortBy,

    // Refs
    heatmapContainerRef,

    // Derived data
    selectedTask,
    stateOptions,
    frameClicks,
    filteredFrameClicks,
    activeFilters,
    frameClickStats,
    selectedFrame,
    participantOptions,
    frameStats,

    // Loading/error
    isLoading,
    error,

    // Actions
    handleDownloadPNG,
  }
}
