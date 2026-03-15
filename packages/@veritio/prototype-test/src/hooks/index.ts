/**
 * Prototype Test Hooks
 */

// Data fetching hooks (standalone, no @/ dependencies)
export { usePrototypeTestOverview } from './use-prototype-test-results'
export { usePrototypeTestFrames } from './use-prototype-test-frames'
export { usePrototypeTestSessions } from './use-prototype-test-sessions'
export { usePrototypeTestParticipants } from './use-prototype-test-participants'
export { usePrototypeTestTaskAttemptPaths } from './use-prototype-test-task-attempt-paths'
export { usePrototypeTestNavigationEvents } from './use-prototype-test-navigation-events'
export type { NavigationEventData, ComponentStateEventData } from './use-prototype-test-navigation-events'
export { useABTests } from './use-ab-tests'
export { useSurveySections } from './use-survey-sections'
export { usePrototypeControls } from './use-prototype-controls'
export type {
  ComponentStateSnapshot,
  ComponentStateChangeEvent,
  PrototypeControlsOptions,
  PrototypeState,
  PrototypeControls,
  FigmaControlMessageType,
  FigmaEventType,
} from './use-prototype-controls'

// Auth hooks (standalone)
export { useAuthFetch } from './use-auth-fetch'
export { useFigmaConnection } from './use-figma-connection'

// UI hooks - re-export from @veritio/ui
export { useBreakpoint, usePagination } from '@veritio/ui'
export type { Breakpoint, BreakpointState, PaginationOptions, PaginationState, PageSizeOption } from '@veritio/ui'
export { useValidationHighlight } from './use-validation-highlight'

// User preferences (standalone)
export { useUserPreferences } from './use-user-preferences'

// Analysis hooks (standalone)
export { useParticipantDetailPanel } from './use-participant-detail-panel'
export { useAdvancedMetrics, estimateOptimalPathLength, filterAttemptsForTask } from './use-advanced-metrics'
export type { UseAdvancedMetricsOptions, UseAdvancedMetricsResult } from './use-advanced-metrics'

// DnD hooks (standalone)
export * from './use-dnd-sensors'
export * from './use-drag-reorder'

// Click maps panel hooks (standalone)
export * from './use-click-maps-panels'
// Yjs collaboration hooks - Re-export from @veritio/yjs

// Generic Yjs hooks (from @veritio/yjs)
export {
  useYjsDocument,
  useYjsAwareness,
  useYjsText,
  useYjsArray,
  useYjsMap,
  useCollaborativePresence,
  useAllCollaborativePresence,
  useCollaborativeField,
  useTabPresence,
} from '@veritio/yjs'

// Re-export Yjs types
export type { YjsConnectionState, YjsUser, YjsCursor, YjsAwarenessState } from '@veritio/yjs'

// Store-dependent sync hooks (kept in this package)
export { useYjsTreeSync } from './use-yjs-tree-sync'
export { useYjsFlowSync } from './use-yjs-flow-sync'
export { useYjsMetaSync } from './use-yjs-meta-sync'

