/**
 * Flow Diagram Module
 *
 * Exports for the Sankey-style flow visualization of user navigation patterns.
 */

// Types
export type {
  FlowNode,
  FlowNodeType,
  FlowNodeRole,
  FlowLink,
  FlowDiagramData,
  FlowDiagramFilters,
  FlowDiagramConfig,
  OptimalPath,
  OptimalPathType,
  NavigationEventInput,
  ComponentStateEventInput,
  TaskAttemptInput,
  FrameInput,
  TaskInput,
  ComponentInstancePositionInput,
  ComponentVariantInput,
} from './types'

export { DEFAULT_FLOW_FILTERS, DEFAULT_FLOW_CONFIG } from './types'

// Data building
export {
  buildFlowDiagramData,
  filterLinksByMinParticipants,
  getConnectedNodes,
  isNodeOnPath,
  isLinkOnPath,
} from './build-flow-data'

// Components (to be added)
export { FlowDiagramTab } from './flow-diagram-tab'
export { FlowVisualization } from './flow-visualization'
export { FlowControls } from './flow-controls'
export { FlowLegend } from './flow-legend'
export { FlowTooltip } from './flow-tooltip'
export { FlowNodeDetail, FlowNodeDetailContent } from './flow-node-detail'
export type { FlowNodeDetailContentProps } from './flow-node-detail'
export { FlowErrorBoundary, WithFlowErrorBoundary } from './flow-error-boundary'
