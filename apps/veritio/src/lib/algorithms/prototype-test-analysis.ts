/**
 * Prototype Test Analysis Algorithms
 *
 * Re-exported from @veritio/prototype-test package.
 */
export {
  type PrototypeStatusBreakdown,
  type TaskOutcome,
  type ParsedTaskAttempt,
  type PrototypeTaskMetrics,
  type PrototypeTestMetrics,
  type ParticipantTaskSummary,
  parseTaskAttempt,
  computePrototypeTestMetrics,
  computeTaskMetrics,
  computeParticipantSummaries,
  computePrototypeStatusBreakdown,
} from '@veritio/prototype-test/algorithms/prototype-test-analysis'

// Re-export types from statistics for convenience (matches original export)
export type { ConfidenceInterval, BoxPlotStats } from '@veritio/analysis-shared'
