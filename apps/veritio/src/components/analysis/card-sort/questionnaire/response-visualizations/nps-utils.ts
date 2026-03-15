import type { StudyFlowResponseRow } from '@veritio/study-types'

interface NPSResponse {
  value: number
}

export interface NPSCounts {
  promoters: number
  passives: number
  detractors: number
  total: number
  npsScore: number
}

export function calculateNPSCounts(responses: StudyFlowResponseRow[]): NPSCounts {
  let promoters = 0
  let passives = 0
  let detractors = 0

  for (const response of responses) {
    const raw = response.response_value
    // Handle both { value: number } (correct format) and plain number (legacy)
    let score: number | null = null
    if (typeof raw === 'number') {
      score = raw
    } else if (typeof raw === 'object' && raw !== null && 'value' in raw) {
      const objValue = (raw as unknown as NPSResponse).value
      if (typeof objValue === 'number') score = objValue
    }

    if (score !== null) {
      if (score >= 9) promoters++
      else if (score >= 7) passives++
      else detractors++
    }
  }

  const total = promoters + passives + detractors
  const npsScore = total > 0
    ? Math.round(((promoters - detractors) / total) * 100)
    : 0

  return { promoters, passives, detractors, total, npsScore }
}

export function getNPSScoreColor(score: number): string {
  if (score >= 50) return '#22c55e'
  if (score >= 0) return '#f59e0b'
  return '#ef4444'
}
