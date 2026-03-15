'use client'

import { useCallback, useRef } from 'react'
import { useFloatingActionBar } from '../components/analysis/shared/floating-action-bar'
import { PathDetailPanel } from '../components/analysis/prototype-test/paths/path-detail-panel'
import type { AggregatedPathData, IndividualPathData } from '../components/analysis/prototype-test/paths/paths-utils'
import type { PrototypeTestFrame, PrototypeTestTaskAttempt, Participant } from '@veritio/study-types'
import type { ComponentInstanceRow, ComponentVariantRow } from './use-prototype-test-attempt-events'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import { resolveParticipantDisplay, extractDemographicsFromMetadata } from '@/lib/utils/participant-display'

const PANEL_ID = 'path-detail'

interface PathDetailContext {
  frameMap: Map<string, PrototypeTestFrame>
  goalFrameIds: Set<string>
  componentInstances: ComponentInstanceRow[]
  componentVariants: ComponentVariantRow[]
  sortedAggregated: AggregatedPathData[]
  sortedIndividual: IndividualPathData[]
  taskAttempts: PrototypeTestTaskAttempt[]
  participants: Participant[]
  displaySettings?: ParticipantDisplaySettings | null
}

export function usePathDetailPanel() {
  const { openDynamicPanel, closePanel, activePanel } = useFloatingActionBar()

  const contextRef = useRef<PathDetailContext | null>(null)
  const closePanelRef = useRef(closePanel)
  // eslint-disable-next-line react-hooks/refs
  closePanelRef.current = closePanel

  const openPathKeyRef = useRef<string | null>(null)
  const activePanelRef = useRef(activePanel)
  // eslint-disable-next-line react-hooks/refs
  activePanelRef.current = activePanel

  const openAggRef = useRef<(path: AggregatedPathData, index: number) => void>(() => {})
  const openIndRef = useRef<(path: IndividualPathData, index: number) => void>(() => {})

  const setContext = useCallback((ctx: PathDetailContext) => {
    contextRef.current = ctx
  }, [])

  const getAttemptMetrics = useCallback((attemptId: string) => {
    const attempt = contextRef.current?.taskAttempts.find(a => a.id === attemptId)
    if (!attempt) return undefined
    return {
      totalTimeMs: attempt.total_time_ms ?? null,
      clickCount: attempt.click_count ?? null,
      misclickCount: attempt.misclick_count ?? null,
      backtrackCount: attempt.backtrack_count ?? null,
    }
  }, [])

  const getParticipantLabel = useCallback((participantId: string, participantIndex: number) => {
    const ctx = contextRef.current
    const participant = ctx?.participants.find(p => p.id === participantId)
    if (!participant) return `Participant ${participantIndex}`
    const demographics = extractDemographicsFromMetadata(participant.metadata)
    const display = resolveParticipantDisplay(ctx?.displaySettings, {
      index: participantIndex,
      demographics,
    })
    return display.primary
  }, [])

  const handleClose = useCallback(() => {
    openPathKeyRef.current = null
    closePanelRef.current()
  }, [])

  const openAggregatedPathDetail = useCallback((path: AggregatedPathData, index: number) => {
    const ctx = contextRef.current
    if (!ctx) return

    const key = `agg:${path.pathKey}`
    if (openPathKeyRef.current === key && activePanelRef.current === PANEL_ID) {
      handleClose()
      return
    }
    openPathKeyRef.current = key

    const handleNavigate = (direction: 'prev' | 'next') => {
      const newIndex = direction === 'prev' ? index - 1 : index + 1
      const data = contextRef.current?.sortedAggregated
      if (!data || newIndex < 0 || newIndex >= data.length) return
      openAggRef.current(data[newIndex], newIndex)
    }

    openDynamicPanel(PANEL_ID, {
      content: (
        <PathDetailPanel
          mode="aggregated"
          aggregatedPath={path}
          frameMap={ctx.frameMap}
          goalFrameIds={ctx.goalFrameIds}
          componentInstances={ctx.componentInstances}
          componentVariants={ctx.componentVariants}
          currentIndex={index}
          totalCount={ctx.sortedAggregated.length}
          onNavigate={handleNavigate}
          onClose={handleClose}
        />
      ),
      hideHeader: true,
      width: 'default',
    })
  }, [openDynamicPanel, handleClose])

  const openIndividualPathDetail = useCallback((path: IndividualPathData, index: number) => {
    const ctx = contextRef.current
    if (!ctx) return

    const key = `ind:${path.attemptId}`
    if (openPathKeyRef.current === key && activePanelRef.current === PANEL_ID) {
      handleClose()
      return
    }
    openPathKeyRef.current = key

    const handleNavigate = (direction: 'prev' | 'next') => {
      const newIndex = direction === 'prev' ? index - 1 : index + 1
      const data = contextRef.current?.sortedIndividual
      if (!data || newIndex < 0 || newIndex >= data.length) return
      openIndRef.current(data[newIndex], newIndex)
    }

    openDynamicPanel(PANEL_ID, {
      content: (
        <PathDetailPanel
          mode="individual"
          individualPath={path}
          attemptMetrics={getAttemptMetrics(path.attemptId)}
          participantLabel={getParticipantLabel(path.participantId, path.participantIndex)}
          frameMap={ctx.frameMap}
          goalFrameIds={ctx.goalFrameIds}
          componentInstances={ctx.componentInstances}
          componentVariants={ctx.componentVariants}
          currentIndex={index}
          totalCount={ctx.sortedIndividual.length}
          onNavigate={handleNavigate}
          onClose={handleClose}
        />
      ),
      hideHeader: true,
      width: 'default',
    })
  }, [openDynamicPanel, handleClose, getAttemptMetrics, getParticipantLabel])

  // eslint-disable-next-line react-hooks/refs
  openAggRef.current = openAggregatedPathDetail
  // eslint-disable-next-line react-hooks/refs
  openIndRef.current = openIndividualPathDetail

  return {
    setContext,
    openAggregatedPathDetail,
    openIndividualPathDetail,
  }
}
