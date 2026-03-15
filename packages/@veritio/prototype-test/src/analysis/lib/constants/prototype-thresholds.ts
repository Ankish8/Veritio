/**
 * Re-export prototype thresholds from lib/constants
 *
 * This provides a convenient import path for analysis components.
 */

export {
  PROTOTYPE_THRESHOLDS,
  METRIC_COLOR_THRESHOLDS,
  SCORE_BENCHMARKS,
  LOSTNESS_THRESHOLDS,
  PATH_EFFICIENCY_THRESHOLDS,
  getProblemIndicator,
  getMetricColorClass,
  getScoreRangeLabel,
  getLostnessLabel,
  getPathEfficiencyLabel,
  type MetricThreshold,
  type PrototypeThresholds,
} from '../../../lib/constants/prototype-thresholds'
