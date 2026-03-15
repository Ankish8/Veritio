'use client'

/**
 * Public Prototype Test Overview
 *
 * Thin wrapper around the dashboard ResultsOverview component.
 * Gains: memo wrapping, task pagination, correct task-level time source.
 */

import { ResultsOverview } from '@/components/analysis/prototype-test/results-overview'
import type { PrototypeTestMetrics, PrototypeTaskMetrics } from '@/lib/algorithms/prototype-test-analysis'
import type { Participant } from '@veritio/study-types'

interface PublicPrototypeTestOverviewProps {
  metrics: PrototypeTestMetrics & { participantTaskTimes?: number[] }
  participants: Participant[]
  taskMetrics: PrototypeTaskMetrics[]
}

export function PublicPrototypeTestOverview({ metrics, participants, taskMetrics }: PublicPrototypeTestOverviewProps) {
  // Ensure participantTaskTimes exists (computed server-side, may be missing in edge cases)
  const metricsWithTimes: PrototypeTestMetrics = {
    ...metrics,
    participantTaskTimes: metrics.participantTaskTimes || participants
      .filter((p) => p.completed_at && p.started_at)
      .map((p) => new Date(p.completed_at!).getTime() - new Date(p.started_at!).getTime())
      .filter((t) => t > 0),
  }

  return <ResultsOverview metrics={metricsWithTimes} participants={participants} taskMetrics={taskMetrics} />
}
