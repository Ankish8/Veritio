// Prototype Test Builder Components
export { PrototypeTab } from './tabs/prototype-tab'
export { PrototypeTasksTab } from './tabs/tasks-tab'
export { FigmaImportDialog } from './figma-import-dialog'
export { PrototypePreview } from './prototype-preview'
export { FrameSelectorDialog } from './frame-selector-dialog'
export { TaskList } from './task-list'
export { TaskItem } from './task-item'
export { SettingsPanel } from './settings-panel'
export { FlowTypeSelector, type FlowType } from './flow-type-selector'

// Success Criteria Components
export { AddCorrectAnswerModal, type SuccessCriteriaType } from './add-correct-answer-modal'
export { SuccessCriteriaSelector } from './success-criteria-selector'
export { PathPreview, PathPreviewInline } from './path-preview'
export { PathwayBuilderModal } from './pathway-builder-modal'
export { PathwayPreview, PathwayPreviewPanel } from './pathway-preview'
export {
  StateSuccessCriteria,
  type StateSuccessCriteriaConfig,
  type StateLogicOperator,
} from './state-success-criteria'
export { SuccessCriteriaGuidance } from './success-criteria-guidance'

// Free Flow Components
export { FreeFlowConfig, FreeFlowBadge } from './free-flow-config'

// Composite Thumbnail (frame overlay composition)
export {
  CompositeThumbnail,
  computePathOverlays,
  isOverlayFrame,
  type ComponentVariantData,
  type ComponentInstanceData,
  type OverlayData,
} from './composite-thumbnail'
