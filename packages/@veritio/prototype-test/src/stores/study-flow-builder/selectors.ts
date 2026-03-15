import type { StudyFlowBuilderState } from './types'
import { selectFlowIsDirty } from './helpers'
// SELECTOR FACTORIES
// These are factory functions that take the store hook and return selector hooks.
// This avoids circular dependencies with index.ts.
export function createSelectors(useStore: <T>(selector: (state: StudyFlowBuilderState) => T) => T) {
  return {
    useFlowSettings: () => useStore((state) => state.flowSettings),
    useScreeningQuestions: () => useStore((state) => state.screeningQuestions),
    usePreStudyQuestions: () => useStore((state) => state.preStudyQuestions),
    usePostStudyQuestions: () => useStore((state) => state.postStudyQuestions),
    useSurveyQuestions: () => useStore((state) => state.surveyQuestions),
    useActiveFlowSection: () => useStore((state) => state.activeFlowSection),
    useFlowIsDirty: () => useStore(selectFlowIsDirty),
  }
}
