import type { MetricThreshold } from './prototype-thresholds'
import { getProblemIndicator } from './prototype-thresholds'

export { getProblemIndicator }

export interface FirstClickThresholds {
  successRate: MetricThreshold
  avgTimeMs: MetricThreshold
  missRate: MetricThreshold
  clickAccuracy: MetricThreshold
  sdd: MetricThreshold
}

export const FIRST_CLICK_THRESHOLDS: FirstClickThresholds = {
  successRate: { low: 50 },
  avgTimeMs: { high: 10000 },
  missRate: { high: 40 },
  clickAccuracy: { low: 30 },
  sdd: { high: 0.25 },
}

export const FIRST_CLICK_BADGE_TOOLTIPS = {
  success: {
    low: 'Success rate is below 50%. The target area may be hard to find or the task instruction unclear.',
  },
  time: {
    high: 'Average click time exceeds 10 seconds. Users may be struggling to locate the target.',
  },
  miss: {
    high: 'Miss rate exceeds 40%. Many clicks are landing outside defined areas of interest.',
  },
  clickAccuracy: {
    low: 'Click accuracy score is below 30. Clicks are landing far from the target.',
  },
  sdd: {
    high: 'Spatial dispersion exceeds 25%. Clicks are highly spread out across the image.',
  },
} as const
