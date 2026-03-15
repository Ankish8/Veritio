'use client'

import { useState, useMemo } from 'react'
import { TaskSelector } from '../task-results/task-selector'
import { EmbeddedPathsSection } from '../task-results/embedded-paths-section'
import type {
  PrototypeTestTask,
  PrototypeTestFrame,
  PrototypeTestTaskAttempt,
  Participant,
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
} from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'

interface ParticipantPathsTabProps {
  studyId: string
  tasks: PrototypeTestTask[]
  frames: PrototypeTestFrame[]
  taskAttempts: PrototypeTestTaskAttempt[]
  participants: Participant[]
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
  displaySettings?: ParticipantDisplaySettings | null
}

/**
 * Standalone Participant Paths tab for the analysis view.
 * Renders its own task selector and the paths table at full height.
 */
export function ParticipantPathsTab({
  studyId,
  tasks,
  frames,
  taskAttempts,
  participants,
  flowQuestions = [],
  flowResponses = [],
  displaySettings,
}: ParticipantPathsTabProps) {
  const selectorTasks = useMemo(
    () => tasks.map(t => ({ taskId: t.id, title: t.title })),
    [tasks]
  )

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    tasks.length > 0 ? tasks[0].id : null
  )

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="font-medium text-lg mb-2">No Tasks</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This prototype test has no tasks defined. Add tasks in the builder to see paths here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Task selector */}
      <TaskSelector
        tasks={selectorTasks}
        selectedTaskId={selectedTaskId}
        onTaskSelect={setSelectedTaskId}
        hideLabel
      />

      {/* Paths section (standalone mode — no section header, full height) */}
      {selectedTaskId && (
        <EmbeddedPathsSection
          studyId={studyId}
          selectedTaskId={selectedTaskId}
          tasks={tasks}
          frames={frames}
          taskAttempts={taskAttempts}
          participants={participants}
          flowQuestions={flowQuestions}
          flowResponses={flowResponses}
          displaySettings={displaySettings}
          standalone
        />
      )}
    </div>
  )
}
