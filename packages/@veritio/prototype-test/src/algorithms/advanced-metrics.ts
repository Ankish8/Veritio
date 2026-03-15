import type { ParsedTaskAttempt } from './prototype-test-analysis'

export interface LostnessResult {
  score: number
  uniqueFramesVisited: number
  totalFrameVisits: number
  optimalPathLength: number
  interpretation: 'on-track' | 'mild-confusion' | 'lost'
  color: 'green' | 'yellow' | 'red'
}

export interface PathEfficiencyResult {
  score: number
  components: {
    adherence: number
    extraSteps: number
    backtracks: number
    time: number
  }
  interpretation: 'excellent' | 'good' | 'fair' | 'poor'
}

export interface ConfusionPoint {
  frameId: string
  frameName?: string
  dwellTimeMs: number
  averageDwellTimeMs: number
  ratio: number
  visitNumber: number
}

export interface FrameDwellStats {
  frameId: string
  frameName?: string
  thumbnailUrl?: string | null
  visitCount: number
  avgDwellTimeMs: number
  medianDwellTimeMs: number
  p90DwellTimeMs: number
  isConfusionPoint: boolean
}

export interface DwellTimeAnalysis {
  frameStats: FrameDwellStats[]
  confusionPoints: ConfusionPoint[]
  totalDwellTimeMs: number
  avgTimePerVisitMs: number
}

export interface AdvancedTaskMetrics {
  lostness: LostnessResult
  pathEfficiency: PathEfficiencyResult
  dwellTime: DwellTimeAnalysis
}

export interface NavigationEventForMetrics {
  fromFrameId: string | null
  toFrameId: string
  timeOnFromFrameMs: number | null
  timestamp: string
  taskAttemptId?: string
}

export interface FrameMetadata {
  id: string
  name: string
  thumbnailUrl?: string | null
}

export const LOSTNESS_THRESHOLDS = {
  ON_TRACK_MAX: 0.3,
  MILD_CONFUSION_MAX: 0.6,
} as const

export const PATH_EFFICIENCY_WEIGHTS = {
  ADHERENCE: 0.4,
  EXTRA_STEPS: 0.2,
  BACKTRACKS: 0.3,
  TIME: 0.1,
} as const

export const CONFUSION_THRESHOLD_MULTIPLIER = 2
export function computeLostness(
  pathTaken: string[],
  optimalPathLength: number
): LostnessResult {
  if (pathTaken.length === 0 || optimalPathLength <= 0) {
    return {
      score: 0,
      uniqueFramesVisited: 0,
      totalFrameVisits: 0,
      optimalPathLength,
      interpretation: 'on-track',
      color: 'green',
    }
  }

  const R = pathTaken.length
  const N = new Set(pathTaken).size
  const S = optimalPathLength

  const term1 = Math.pow(N / S - 1, 2)
  const term2 = Math.pow(R / N - 1, 2)
  const score = Math.sqrt(term1 + term2) / Math.sqrt(2)

  const clampedScore = Math.min(Math.max(score, 0), 1)

  let interpretation: LostnessResult['interpretation']
  let color: LostnessResult['color']

  if (clampedScore <= LOSTNESS_THRESHOLDS.ON_TRACK_MAX) {
    interpretation = 'on-track'
    color = 'green'
  } else if (clampedScore <= LOSTNESS_THRESHOLDS.MILD_CONFUSION_MAX) {
    interpretation = 'mild-confusion'
    color = 'yellow'
  } else {
    interpretation = 'lost'
    color = 'red'
  }

  return {
    score: clampedScore,
    uniqueFramesVisited: N,
    totalFrameVisits: R,
    optimalPathLength: S,
    interpretation,
    color,
  }
}

export function computeAverageLostness(
  attempts: ParsedTaskAttempt[],
  optimalPathLength: number
): LostnessResult {
  if (attempts.length === 0) {
    return computeLostness([], optimalPathLength)
  }

  const validAttempts = attempts.filter(
    a => a.path_taken && a.path_taken.length > 0
  )

  if (validAttempts.length === 0) {
    return computeLostness([], optimalPathLength)
  }

  const results = validAttempts.map(a =>
    computeLostness(a.path_taken, optimalPathLength)
  )

  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length
  const avgUnique = results.reduce((sum, r) => sum + r.uniqueFramesVisited, 0) / results.length
  const avgTotal = results.reduce((sum, r) => sum + r.totalFrameVisits, 0) / results.length

  let interpretation: LostnessResult['interpretation']
  let color: LostnessResult['color']

  if (avgScore <= LOSTNESS_THRESHOLDS.ON_TRACK_MAX) {
    interpretation = 'on-track'
    color = 'green'
  } else if (avgScore <= LOSTNESS_THRESHOLDS.MILD_CONFUSION_MAX) {
    interpretation = 'mild-confusion'
    color = 'yellow'
  } else {
    interpretation = 'lost'
    color = 'red'
  }

  return {
    score: avgScore,
    uniqueFramesVisited: Math.round(avgUnique),
    totalFrameVisits: Math.round(avgTotal),
    optimalPathLength,
    interpretation,
    color,
  }
}
export function computePathEfficiency(
  attempt: ParsedTaskAttempt,
  optimalPathLength: number,
  benchmarkTimeMs: number = 30000
): PathEfficiencyResult {
  const pathTaken = attempt.path_taken || []

  if (pathTaken.length === 0 || optimalPathLength <= 0) {
    return {
      score: 0,
      components: { adherence: 0, extraSteps: 0, backtracks: 0, time: 0 },
      interpretation: 'poor',
    }
  }

  const adherence = Math.max(0, 100 * (optimalPathLength / pathTaken.length))

  const extraSteps = Math.max(0, Math.min(100, pathTaken.length / optimalPathLength))
  const extraStepsScore = extraSteps <= 1 ? 100 : Math.max(0, 100 - (extraSteps - 1) * 25)

  const backtrackCount = attempt.backtrack_count || 0
  const backtracksScore = Math.max(0, 100 - backtrackCount * 15)

  const actualTime = attempt.total_time_ms || benchmarkTimeMs
  const timeRatio = actualTime / benchmarkTimeMs
  const timeScore = timeRatio <= 1 ? 100 : Math.max(0, 100 - (timeRatio - 1) * 50)

  const score =
    adherence * PATH_EFFICIENCY_WEIGHTS.ADHERENCE +
    extraStepsScore * PATH_EFFICIENCY_WEIGHTS.EXTRA_STEPS +
    backtracksScore * PATH_EFFICIENCY_WEIGHTS.BACKTRACKS +
    timeScore * PATH_EFFICIENCY_WEIGHTS.TIME

  let interpretation: PathEfficiencyResult['interpretation']
  if (score >= 80) {
    interpretation = 'excellent'
  } else if (score >= 60) {
    interpretation = 'good'
  } else if (score >= 40) {
    interpretation = 'fair'
  } else {
    interpretation = 'poor'
  }

  return {
    score: Math.round(score * 10) / 10,
    components: {
      adherence: Math.round(adherence * 10) / 10,
      extraSteps: Math.round(extraStepsScore * 10) / 10,
      backtracks: Math.round(backtracksScore * 10) / 10,
      time: Math.round(timeScore * 10) / 10,
    },
    interpretation,
  }
}

export function computeAveragePathEfficiency(
  attempts: ParsedTaskAttempt[],
  optimalPathLength: number,
  benchmarkTimeMs?: number
): PathEfficiencyResult {
  if (attempts.length === 0) {
    return {
      score: 0,
      components: { adherence: 0, extraSteps: 0, backtracks: 0, time: 0 },
      interpretation: 'poor',
    }
  }

  const completedAttempts = attempts.filter(
    a => a.outcome === 'success' || a.outcome === 'failure'
  )

  if (completedAttempts.length === 0) {
    return {
      score: 0,
      components: { adherence: 0, extraSteps: 0, backtracks: 0, time: 0 },
      interpretation: 'poor',
    }
  }

  const results = completedAttempts.map(a =>
    computePathEfficiency(a, optimalPathLength, benchmarkTimeMs)
  )

  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length
  const avgAdherence = results.reduce((sum, r) => sum + r.components.adherence, 0) / results.length
  const avgExtraSteps = results.reduce((sum, r) => sum + r.components.extraSteps, 0) / results.length
  const avgBacktracks = results.reduce((sum, r) => sum + r.components.backtracks, 0) / results.length
  const avgTime = results.reduce((sum, r) => sum + r.components.time, 0) / results.length

  let interpretation: PathEfficiencyResult['interpretation']
  if (avgScore >= 80) {
    interpretation = 'excellent'
  } else if (avgScore >= 60) {
    interpretation = 'good'
  } else if (avgScore >= 40) {
    interpretation = 'fair'
  } else {
    interpretation = 'poor'
  }

  return {
    score: Math.round(avgScore * 10) / 10,
    components: {
      adherence: Math.round(avgAdherence * 10) / 10,
      extraSteps: Math.round(avgExtraSteps * 10) / 10,
      backtracks: Math.round(avgBacktracks * 10) / 10,
      time: Math.round(avgTime * 10) / 10,
    },
    interpretation,
  }
}
export function identifyConfusionPoints(
  navigationEvents: NavigationEventForMetrics[],
  frameMetadata: Map<string, FrameMetadata> = new Map()
): ConfusionPoint[] {
  const validEvents = navigationEvents.filter(
    e => e.fromFrameId && e.timeOnFromFrameMs && e.timeOnFromFrameMs > 0
  )

  if (validEvents.length === 0) {
    return []
  }

  const frameVisits = new Map<string, number[]>()
  for (const event of validEvents) {
    const frameId = event.fromFrameId!
    const dwellTime = event.timeOnFromFrameMs!
    if (!frameVisits.has(frameId)) {
      frameVisits.set(frameId, [])
    }
    frameVisits.get(frameId)!.push(dwellTime)
  }

  const frameAvgDwellTimes = new Map<string, number>()
  Array.from(frameVisits.entries()).forEach(([frameId, dwellTimes]) => {
    const avg = dwellTimes.reduce((sum, t) => sum + t, 0) / dwellTimes.length
    frameAvgDwellTimes.set(frameId, avg)
  })

  const confusionPoints: ConfusionPoint[] = []
  const visitCounts = new Map<string, number>()

  for (const event of validEvents) {
    const frameId = event.fromFrameId!
    const dwellTime = event.timeOnFromFrameMs!
    const avgDwellTime = frameAvgDwellTimes.get(frameId) || dwellTime

    const visitNumber = (visitCounts.get(frameId) || 0) + 1
    visitCounts.set(frameId, visitNumber)

    const ratio = dwellTime / avgDwellTime

    if (ratio > CONFUSION_THRESHOLD_MULTIPLIER) {
      const metadata = frameMetadata.get(frameId)
      confusionPoints.push({
        frameId,
        frameName: metadata?.name,
        dwellTimeMs: dwellTime,
        averageDwellTimeMs: avgDwellTime,
        ratio: Math.round(ratio * 10) / 10,
        visitNumber,
      })
    }
  }

  return confusionPoints.sort((a, b) => b.ratio - a.ratio)
}

export function computeDwellTimeAnalysis(
  navigationEvents: NavigationEventForMetrics[],
  frameMetadata: Map<string, FrameMetadata> = new Map()
): DwellTimeAnalysis {
  const validEvents = navigationEvents.filter(
    e => e.fromFrameId && e.timeOnFromFrameMs && e.timeOnFromFrameMs > 0
  )

  if (validEvents.length === 0) {
    return {
      frameStats: [],
      confusionPoints: [],
      totalDwellTimeMs: 0,
      avgTimePerVisitMs: 0,
    }
  }

  const frameVisits = new Map<string, number[]>()
  let totalDwellTime = 0

  for (const event of validEvents) {
    const frameId = event.fromFrameId!
    const dwellTime = event.timeOnFromFrameMs!
    totalDwellTime += dwellTime

    if (!frameVisits.has(frameId)) {
      frameVisits.set(frameId, [])
    }
    frameVisits.get(frameId)!.push(dwellTime)
  }

  const frameStats: FrameDwellStats[] = []

  Array.from(frameVisits.entries()).forEach(([frameId, dwellTimes]) => {
    const sorted = [...dwellTimes].sort((a, b) => a - b)
    const metadata = frameMetadata.get(frameId)

    const avg = dwellTimes.reduce((sum, t) => sum + t, 0) / dwellTimes.length
    const median = sorted[Math.floor(sorted.length / 2)]
    const p90Index = Math.floor(sorted.length * 0.9)
    const p90 = sorted[p90Index] || sorted[sorted.length - 1]

    frameStats.push({
      frameId,
      frameName: metadata?.name,
      thumbnailUrl: metadata?.thumbnailUrl,
      visitCount: dwellTimes.length,
      avgDwellTimeMs: Math.round(avg),
      medianDwellTimeMs: Math.round(median),
      p90DwellTimeMs: Math.round(p90),
      isConfusionPoint: false,
    })
  })

  const confusionPoints = identifyConfusionPoints(navigationEvents, frameMetadata)

  const confusedFrameIds = new Set(confusionPoints.map(cp => cp.frameId))
  for (const stats of frameStats) {
    stats.isConfusionPoint = confusedFrameIds.has(stats.frameId)
  }

  frameStats.sort((a, b) => b.avgDwellTimeMs * b.visitCount - a.avgDwellTimeMs * a.visitCount)

  return {
    frameStats,
    confusionPoints,
    totalDwellTimeMs: Math.round(totalDwellTime),
    avgTimePerVisitMs: Math.round(totalDwellTime / validEvents.length),
  }
}

export function computeAdvancedTaskMetrics(
  attempts: ParsedTaskAttempt[],
  optimalPathLength: number,
  navigationEvents: NavigationEventForMetrics[] = [],
  frameMetadata: Map<string, FrameMetadata> = new Map(),
  benchmarkTimeMs?: number
): AdvancedTaskMetrics {
  const lostness = computeAverageLostness(attempts, optimalPathLength)
  const pathEfficiency = computeAveragePathEfficiency(attempts, optimalPathLength, benchmarkTimeMs)
  const dwellTime = computeDwellTimeAnalysis(navigationEvents, frameMetadata)

  return {
    lostness,
    pathEfficiency,
    dwellTime,
  }
}

export function getLostnessColorClass(score: number): string {
  if (score <= LOSTNESS_THRESHOLDS.ON_TRACK_MAX) {
    return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800'
  } else if (score <= LOSTNESS_THRESHOLDS.MILD_CONFUSION_MAX) {
    return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800'
  } else {
    return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800'
  }
}

export function getPathEfficiencyColorClass(score: number): string {
  if (score >= 80) {
    return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800'
  } else if (score >= 60) {
    return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800'
  } else if (score >= 40) {
    return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800'
  } else {
    return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800'
  }
}

export function formatLostnessInterpretation(interpretation: LostnessResult['interpretation']): string {
  switch (interpretation) {
    case 'on-track':
      return 'On Track'
    case 'mild-confusion':
      return 'Mild Confusion'
    case 'lost':
      return 'Lost'
  }
}

export function formatPathEfficiencyInterpretation(interpretation: PathEfficiencyResult['interpretation']): string {
  switch (interpretation) {
    case 'excellent':
      return 'Excellent'
    case 'good':
      return 'Good'
    case 'fair':
      return 'Fair'
    case 'poor':
      return 'Poor'
  }
}

export function formatDwellTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`
  } else {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.round((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }
}
