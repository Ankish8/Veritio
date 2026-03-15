/**
 * First Impression Score Algorithm
 *
 * Calculates a composite score (0-100) based on multiple factors:
 * - Response Rate (30% weight)
 * - Positive Sentiment (30% weight) - based on rating questions or keywords
 * - Engagement Quality (40% weight) - based on response time and completeness
 */

export interface ScoreBreakdown {
  responseRateScore: number
  positiveSentimentScore: number
  engagementScore: number
  totalScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  gradeDescription: string
}

export interface ScoreInput {
  totalParticipants: number
  totalResponses: number
  avgResponseTimeMs: number
  expectedResponseTimeMs: number // From study settings
  avgRating?: number // 1-5 scale if available
  maxRating?: number
  positiveKeywordCount?: number
  totalKeywordCount?: number
}

/**
 * Calculate First Impression Score (0-100)
 *
 * Formula:
 * Score = (ResponseRate × 0.3) + (PositiveSentiment × 0.3) + (Engagement × 0.4)
 *
 * Each component is normalized to 0-100 scale.
 */
export function calculateFirstImpressionScore(input: ScoreInput): ScoreBreakdown {
  const {
    totalParticipants,
    totalResponses,
    avgResponseTimeMs,
    expectedResponseTimeMs,
    avgRating,
    maxRating = 5,
    positiveKeywordCount,
    totalKeywordCount,
  } = input

  // 1. Response Rate Score (0-100)
  // 100% response rate = 100 points
  const responseRate = totalParticipants > 0
    ? (totalResponses / totalParticipants) * 100
    : 0
  const responseRateScore = Math.min(100, responseRate)

  // 2. Positive Sentiment Score (0-100)
  // Based on ratings if available, otherwise keywords
  let positiveSentimentScore = 50 // Default neutral score

  if (avgRating !== undefined && avgRating > 0) {
    // Convert rating to percentage (e.g., 4/5 = 80)
    positiveSentimentScore = (avgRating / maxRating) * 100
  } else if (positiveKeywordCount !== undefined && totalKeywordCount !== undefined && totalKeywordCount > 0) {
    // Based on keyword sentiment analysis (future enhancement)
    positiveSentimentScore = (positiveKeywordCount / totalKeywordCount) * 100
  }

  // 3. Engagement Score (0-100)
  // Based on how quickly people respond (faster = more engaged)
  // Also considers response completeness
  let engagementScore = 50 // Default

  if (avgResponseTimeMs > 0 && expectedResponseTimeMs > 0) {
    // If response time is around expected, score is 100
    // If much faster or slower, score decreases
    const timeRatio = avgResponseTimeMs / expectedResponseTimeMs

    if (timeRatio >= 0.5 && timeRatio <= 2) {
      // Within acceptable range (0.5x to 2x expected time)
      engagementScore = 100 - Math.abs(1 - timeRatio) * 50
    } else if (timeRatio < 0.5) {
      // Too fast - might indicate low engagement (rushing)
      engagementScore = 60 - (0.5 - timeRatio) * 40
    } else {
      // Too slow - might indicate confusion
      engagementScore = Math.max(20, 100 - (timeRatio - 1) * 30)
    }
  }

  // Calculate total weighted score
  const totalScore = Math.round(
    responseRateScore * 0.3 +
    positiveSentimentScore * 0.3 +
    engagementScore * 0.4
  )

  // Determine grade
  const { grade, gradeDescription } = getGrade(totalScore)

  return {
    responseRateScore: Math.round(responseRateScore),
    positiveSentimentScore: Math.round(positiveSentimentScore),
    engagementScore: Math.round(engagementScore),
    totalScore,
    grade,
    gradeDescription,
  }
}

/**
 * Get letter grade and description based on score
 */
function getGrade(score: number): { grade: 'A' | 'B' | 'C' | 'D' | 'F'; gradeDescription: string } {
  if (score >= 90) {
    return { grade: 'A', gradeDescription: 'Excellent first impression' }
  } else if (score >= 80) {
    return { grade: 'B', gradeDescription: 'Good first impression' }
  } else if (score >= 70) {
    return { grade: 'C', gradeDescription: 'Average first impression' }
  } else if (score >= 60) {
    return { grade: 'D', gradeDescription: 'Below average - needs improvement' }
  } else {
    return { grade: 'F', gradeDescription: 'Poor first impression - significant issues' }
  }
}

/**
 * Get color for score display
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

/**
 * Get background color for score gauge
 */
export function getScoreBackgroundColor(score: number): string {
  if (score >= 80) return 'stroke-green-500'
  if (score >= 60) return 'stroke-yellow-500'
  if (score >= 40) return 'stroke-orange-500'
  return 'stroke-red-500'
}
