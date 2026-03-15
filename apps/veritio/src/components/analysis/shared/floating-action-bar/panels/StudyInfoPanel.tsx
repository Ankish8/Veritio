'use client'

import { StudyInfoPanel as SharedStudyInfoPanel, type StudyInfoPanelProps } from '@/components/shared'

/** Props for the results-context StudyInfoPanel (excludes 'context' which is set automatically) */
export type ResultsStudyInfoPanelProps = Omit<StudyInfoPanelProps, 'context'>

export function StudyInfoPanel(props: ResultsStudyInfoPanelProps) {
  return <SharedStudyInfoPanel {...props} context="results" />
}
