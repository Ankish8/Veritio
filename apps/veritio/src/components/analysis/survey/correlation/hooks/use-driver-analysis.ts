'use client'

import { useMemo } from 'react'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type {
  DriverAnalysisData,
  DriverResult,
  QuestionCorrelationInfo,
  CorrelationDisplayOptions,
} from '../types'
import { getCompatibleQuestions, mapToCorrelationDataType } from '../utils/question-type-utils'
import {
  extractQuestionData,
  getPairedData,
} from '../utils/data-extraction'
import {
  calculateCorrelation,
  selectCorrelationMethod,
} from '@/lib/algorithms/correlation-statistics'

interface UseDriverAnalysisProps {
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  filteredParticipantIds: Set<string> | null
  targetQuestionId: string | null
  displayOptions: CorrelationDisplayOptions
}

interface UseDriverAnalysisResult {
  compatibleQuestions: QuestionCorrelationInfo[]
  analysisData: DriverAnalysisData | null
}

export function useDriverAnalysis({
  flowQuestions,
  flowResponses,
  filteredParticipantIds,
  targetQuestionId,
  displayOptions,
}: UseDriverAnalysisProps): UseDriverAnalysisResult {
  // Get compatible questions
  const compatibleQuestions = useMemo(
    () => getCompatibleQuestions(flowQuestions),
    [flowQuestions]
  )

  // Find target question
  const targetQuestion = useMemo(
    () => compatibleQuestions.find(q => q.id === targetQuestionId) || null,
    [compatibleQuestions, targetQuestionId]
  )

  // Extract target question data
  const targetData = useMemo(() => {
    if (!targetQuestion) return null

    return extractQuestionData(
      targetQuestion.id,
      targetQuestion,
      flowResponses,
      filteredParticipantIds
    )
  }, [targetQuestion, flowResponses, filteredParticipantIds])

  // Compute driver analysis
  const analysisData = useMemo<DriverAnalysisData | null>(() => {
    if (!targetQuestion || !targetData || targetData.length === 0) {
      return null
    }

    const drivers: DriverResult[] = []

    // Calculate correlation with each other question
    for (const question of compatibleQuestions) {
      // Skip the target question itself
      if (question.id === targetQuestionId) continue

      const questionData = extractQuestionData(
        question.id,
        question,
        flowResponses,
        filteredParticipantIds
      )

      const paired = getPairedData(targetData, questionData)

      // Skip if not enough paired data
      if (paired.n < displayOptions.minSampleSize) {
        continue
      }

      // Determine correlation method
      const targetDataType = mapToCorrelationDataType(targetQuestion.dataType, paired.x)
      const questionDataType = mapToCorrelationDataType(question.dataType, paired.y)
      const method = selectCorrelationMethod(targetDataType, questionDataType)

      // Calculate correlation
      const result = calculateCorrelation(paired.x, paired.y, method)

      // Skip non-significant if option is set
      if (displayOptions.showSignificanceOnly && !result.isSignificant) {
        continue
      }

      drivers.push({
        questionId: question.id,
        questionText: question.text,
        shortText: question.shortText,
        correlation: result,
        rank: 0, // Will be set after sorting
      })
    }

    // Sort by absolute correlation strength (descending)
    drivers.sort((a, b) =>
      Math.abs(b.correlation.coefficient) - Math.abs(a.correlation.coefficient)
    )

    // Assign ranks
    drivers.forEach((driver, index) => {
      driver.rank = index + 1
    })

    return {
      targetQuestion,
      drivers,
    }
  }, [
    targetQuestion,
    targetData,
    targetQuestionId,
    compatibleQuestions,
    flowResponses,
    filteredParticipantIds,
    displayOptions,
  ])

  return {
    compatibleQuestions,
    analysisData,
  }
}

export function getSuggestedTargetQuestions(
  questions: QuestionCorrelationInfo[]
): QuestionCorrelationInfo[] {
  const keywords = [
    'nps', 'recommend', 'satisfaction', 'satisfied', 'overall',
    'likelihood', 'rating', 'score', 'experience'
  ]

  return questions.filter(q => {
    const lowerText = q.text.toLowerCase()
    return (
      q.type === 'nps' ||
      q.type === 'opinion_scale' ||
      q.type === 'slider' ||
      keywords.some(kw => lowerText.includes(kw))
    )
  })
}
