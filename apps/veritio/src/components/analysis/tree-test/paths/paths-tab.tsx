'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Task, TreeNode } from '@veritio/study-types'
import type { TreeTestResponse, Participant } from '@/lib/algorithms/tree-test-analysis'
import { TaskBreadcrumb } from '../task-results/task-breadcrumb'
import { ParticipantDetailDialogBase } from '@veritio/analysis-shared'
import { TreeTestParticipantDetailContent } from '../participants/tree-test-participant-detail-content'
import { PathsHeader } from './paths-header'
import { PathsTable } from './paths-table'
import {
  type ResultType,
  ALL_RESULT_TYPES,
  filterByResultTypes,
  computeAggregatedPaths,
  computeIndividualPaths,
} from './paths-utils'
import { useParticipantDetail } from './use-participant-detail'
import { useTaskAnalysis } from '../shared/use-task-analysis'

interface PathsTabProps {
  studyId: string
  tasks: Task[]
  nodes: TreeNode[]
  responses: TreeTestResponse[]
  participants: Participant[]
  initialSelectedTaskId?: string | null
  onSelectedTaskIdChange?: (taskId: string | null) => void
}

/**
 * Paths Analysis Tab
 *
 * Shows how participants navigated through the tree for each task.
 * Features:
 * - Task selector to switch between tasks
 * - Result type filters (direct/indirect success/fail/skip)
 * - Toggle between aggregated paths and individual participant paths
 * - Sortable table with clickable participant links
 */
export function PathsTab({
  studyId,
  tasks,
  nodes,
  responses,
  participants,
  initialSelectedTaskId = null,
  onSelectedTaskIdChange,
}: PathsTabProps) {
  const {
    selectedTaskId: internalSelectedTaskId,
    selectedTask,
    taskIndex,
    correctPathBreadcrumb,
    taskResponses,
    selectorTasks,
    handleTaskSelect,
  } = useTaskAnalysis({
    tasks,
    nodes,
    responses,
    initialSelectedTaskId,
    onSelectedTaskIdChange,
  })

  const [selectedResultTypes, setSelectedResultTypes] = useState<Set<ResultType>>(
    new Set(ALL_RESULT_TYPES)
  )
  const [showAllParticipants, setShowAllParticipants] = useState(false)

  const filteredResponses = useMemo(() => {
    return filterByResultTypes(taskResponses, selectedResultTypes)
  }, [taskResponses, selectedResultTypes])

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])
  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks])

  const participantIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    participants.forEach((p, index) => { map.set(p.id, index + 1) })
    return map
  }, [participants])

  const totalParticipants = taskResponses.length

  const aggregatedData = useMemo(() => {
    return computeAggregatedPaths(filteredResponses, nodeMap, totalParticipants)
  }, [filteredResponses, nodeMap, totalParticipants])

  const individualData = useMemo(() => {
    return computeIndividualPaths(filteredResponses, nodeMap, participantIndexMap)
  }, [filteredResponses, nodeMap, participantIndexMap])

  // Participant detail dialog
  const {
    selectedParticipantSummary,
    canNavigatePrev,
    canNavigateNext,
    handleParticipantClick,
    handleClose,
    handleNavigateParticipant,
  } = useParticipantDetail({
    participants,
    responses,
    participantIndexMap,
    individualData,
  })

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="font-medium text-lg mb-2">No Tasks</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This tree test has no tasks defined. Add tasks in the builder to see path analysis.
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <PathsHeader
          tasks={selectorTasks}
          selectedTaskId={internalSelectedTaskId}
          onTaskSelect={handleTaskSelect}
          selectedResultTypes={selectedResultTypes}
          onSelectedResultTypesChange={setSelectedResultTypes}
          showAllParticipants={showAllParticipants}
          onShowAllParticipantsChange={setShowAllParticipants}
        />

        {selectedTask && (
          <TaskBreadcrumb
            taskNumber={taskIndex + 1}
            taskQuestion={selectedTask.question}
            breadcrumbPath={correctPathBreadcrumb}
          />
        )}

        {selectedTask && (
          <Card className="p-4 overflow-visible border-0 shadow-none">
            <PathsTable
              aggregatedData={aggregatedData}
              individualData={individualData}
              showAllParticipants={showAllParticipants}
              onParticipantClick={handleParticipantClick}
            />
          </Card>
        )}

        <ParticipantDetailDialogBase
          open={!!selectedParticipantSummary}
          onClose={handleClose}
          onNavigate={handleNavigateParticipant}
          canNavigatePrev={canNavigatePrev}
          canNavigateNext={canNavigateNext}
          participantIndex={selectedParticipantSummary?.participantIndex ?? 0}
        >
          {selectedParticipantSummary && (
            <TreeTestParticipantDetailContent
              studyId={studyId}
              successCount={selectedParticipantSummary.successCount}
              directCount={selectedParticipantSummary.directCount}
              totalTime={selectedParticipantSummary.totalTime}
              totalTasks={tasks.length}
              responses={selectedParticipantSummary.responses}
              tasks={tasks}
              taskMap={taskMap}
              nodeMap={nodeMap}
              flowResponses={[]}
              flowQuestions={[]}
            />
          )}
        </ParticipantDetailDialogBase>
      </div>
    </TooltipProvider>
  )
}
