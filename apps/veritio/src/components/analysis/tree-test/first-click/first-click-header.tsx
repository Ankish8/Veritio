'use client'

import { AnalysisTabHeader } from '../shared/analysis-tab-header'

interface FirstClickHeaderProps {
  tasks: { taskId: string; question: string }[]
  selectedTaskId: string | null
  onTaskSelect: (taskId: string) => void
}

const TOOLTIP_TEXT =
  'The first click table tells you if the first node your participants ' +
  'clicked was on the correct path to a destination. This can be useful ' +
  'to gauge how clear your top-level labels are to participants and how ' +
  'clearly they communicate a potential correct path in relation to the task.'

export function FirstClickHeader({
  tasks,
  selectedTaskId,
  onTaskSelect,
}: FirstClickHeaderProps) {
  return (
    <AnalysisTabHeader
      title="First click"
      tooltipText={TOOLTIP_TEXT}
      tasks={tasks}
      selectedTaskId={selectedTaskId}
      onTaskSelect={onTaskSelect}
    />
  )
}
