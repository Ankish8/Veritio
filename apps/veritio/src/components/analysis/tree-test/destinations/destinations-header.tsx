'use client'

import { AnalysisTabHeader } from '../shared/analysis-tab-header'

interface DestinationsHeaderProps {
  tasks: { taskId: string; question: string }[]
  selectedTaskId: string | null
  onTaskSelect: (taskId: string) => void
}

const TOOLTIP_TEXT =
  'The destinations table shows the popularity of the destinations your ' +
  'participants chose, divided into correct and incorrect destinations. ' +
  'This can be useful to see if there is agreement across the destinations ' +
  'chosen and whether your participants agree with you about where to find ' +
  'information to solve a task. If most of your participants navigated to ' +
  'your correct destination(s) your destination labels are clear.'

/**
 * Header component for the Destinations analysis tab.
 * Contains title with info tooltip and task selector.
 */
export function DestinationsHeader({
  tasks,
  selectedTaskId,
  onTaskSelect,
}: DestinationsHeaderProps) {
  return (
    <AnalysisTabHeader
      title="Destinations"
      tooltipText={TOOLTIP_TEXT}
      tasks={tasks}
      selectedTaskId={selectedTaskId}
      onTaskSelect={onTaskSelect}
    />
  )
}
