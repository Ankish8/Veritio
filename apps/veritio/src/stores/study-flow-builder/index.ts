// Re-export the study-flow-builder store from the @veritio/prototype-test package.
// The canonical source was moved there; this stub keeps app-level imports working.
export {
  useStudyFlowBuilderStore,
  selectFlowIsDirty,
  useFlowIsDirty,
  useActiveFlowSection,
  type StudyFlowBuilderState,
  type SaveStatus,
  type BuilderTab,
  type ActiveFlowSection,
} from '@veritio/prototype-test/stores/study-flow-builder'
