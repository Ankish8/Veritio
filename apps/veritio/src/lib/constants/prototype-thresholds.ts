/**
 * Threshold configuration for Prototype Test metrics
 *
 * Used to determine when to show problem indicator badges
 * and color-code values in the Task Results page.
 */

export interface MetricThreshold {
  /** Value below this shows "LOW" warning (for metrics where lower is worse) */
  low?: number
  /** Value above this shows "HIGH" warning (for metrics where higher is worse) */
  high?: number
}

export interface PrototypeThresholds {
  successRate: MetricThreshold
  directnessRate: MetricThreshold
  misclickRate: MetricThreshold
  avgTimeMs: MetricThreshold
  taskScore: MetricThreshold
}

/**
 * Default thresholds for prototype test metrics
 *
 * These values are based on industry benchmarks and UX research best practices.
 * Adjust as needed for your specific context.
 */
export const PROTOTYPE_THRESHOLDS: PrototypeThresholds = {
  // Success rate: Lower than 50% is concerning
  successRate: {
    low: 50,
  },

  // Directness: Lower than 40% means lots of backtracking
  directnessRate: {
    low: 40,
  },

  // Misclick rate: Higher than 25% indicates unclear UI
  misclickRate: {
    high: 25,
  },

  // Average time: Over 2 minutes (120000ms) is concerning
  avgTimeMs: {
    high: 120000,
  },

  // Task score: Below 5/10 needs attention
  taskScore: {
    low: 5,
  },
}

/**
 * Color thresholds for metric values (green/amber/red)
 * Used for Task Comparison View and visual indicators
 */
export const METRIC_COLOR_THRESHOLDS = {
  successRate: {
    excellent: 80, // >= 80% green
    acceptable: 60, // >= 60% amber
    // < 60% red
  },
  directnessRate: {
    excellent: 70,
    acceptable: 50,
  },
  misclickRate: {
    excellent: 10, // <= 10% green
    acceptable: 20, // <= 20% amber
    // > 20% red
  },
  avgTimeMs: {
    excellent: 30000, // <= 30s green
    acceptable: 60000, // <= 60s amber
    // > 60s red
  },
  taskScore: {
    excellent: 7.5, // >= 7.5 green
    acceptable: 5, // >= 5 amber
    // < 5 red
  },
}

/**
 * Score benchmark information
 */
export const SCORE_BENCHMARKS = {
  ranges: [
    { min: 0, max: 4, label: 'Poor', color: 'red' },
    { min: 4, max: 6, label: 'Fair', color: 'amber' },
    { min: 6, max: 8, label: 'Good', color: 'green' },
    { min: 8, max: 10, label: 'Excellent', color: 'emerald' },
  ],
  description: 'Score = (Success Rate × 3 + Directness Rate) / 4',
}

/**
 * Helper function to determine problem indicator type
 */
export function getProblemIndicator(
  value: number,
  thresholds: MetricThreshold
): 'high' | 'low' | null {
  if (thresholds.low !== undefined && value < thresholds.low) {
    return 'low'
  }
  if (thresholds.high !== undefined && value > thresholds.high) {
    return 'high'
  }
  return null
}

/**
 * Helper function to get color class based on metric value
 * Returns: 'green' | 'amber' | 'red'
 */
export function getMetricColorClass(
  metricKey: keyof typeof METRIC_COLOR_THRESHOLDS,
  value: number
): 'green' | 'amber' | 'red' {
  const thresholds = METRIC_COLOR_THRESHOLDS[metricKey]

  // For metrics where lower is better (misclickRate, avgTimeMs)
  if (metricKey === 'misclickRate' || metricKey === 'avgTimeMs') {
    if (value <= thresholds.excellent) return 'green'
    if (value <= thresholds.acceptable) return 'amber'
    return 'red'
  }

  // For metrics where higher is better (successRate, directnessRate, taskScore)
  if (value >= thresholds.excellent) return 'green'
  if (value >= thresholds.acceptable) return 'amber'
  return 'red'
}

/**
 * Get the score range label (Poor/Fair/Good/Excellent)
 */
export function getScoreRangeLabel(score: number): string {
  const range = SCORE_BENCHMARKS.ranges.find(
    (r) => score >= r.min && score < r.max
  )
  // Handle edge case for score = 10
  if (score >= 10) return 'Excellent'
  return range?.label ?? 'Unknown'
}
