'use client'

/**
 * Public Tree Test Overview
 *
 * Thin wrapper around the dashboard ResultsOverview component.
 * Gains: task pagination (10-limit), DestinationsOverview section, proper sub-component imports.
 */

import { ResultsOverview } from '@/components/analysis/tree-test/results-overview'
import type { OverallMetrics, TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'
import type { Task, TreeNode, Participant } from '@veritio/study-types'

interface PublicTreeTestOverviewProps {
  metrics: OverallMetrics
  responses: TreeTestResponse[]
  participants: Participant[]
  tasks: Task[]
  nodes: TreeNode[]
}

export function PublicTreeTestOverview({ metrics, responses, participants, tasks, nodes }: PublicTreeTestOverviewProps) {
  return <ResultsOverview metrics={metrics} responses={responses} participants={participants} tasks={tasks} nodes={nodes} />
}
