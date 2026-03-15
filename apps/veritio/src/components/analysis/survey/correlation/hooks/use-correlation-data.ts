'use client'

import { useMemo } from 'react'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type {
  CorrelationMatrixData,
  CorrelationPair,
  QuestionCorrelationInfo,
  CorrelationDisplayOptions,
} from '../types'
import { getPairKey } from '../types'
import { getCompatibleQuestions, mapToCorrelationDataType } from '../utils/question-type-utils'
import {
  extractQuestionData,
  getPairedData,
} from '../utils/data-extraction'
import {
  calculateCorrelation,
  selectCorrelationMethod,
} from '@/lib/algorithms/correlation-statistics'

interface UseCorrelationDataProps {
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  filteredParticipantIds: Set<string> | null
  displayOptions: CorrelationDisplayOptions
}

interface UseCorrelationDataResult {
  compatibleQuestions: QuestionCorrelationInfo[]
  matrixData: CorrelationMatrixData | null
}

export function useCorrelationData({
  flowQuestions,
  flowResponses,
  filteredParticipantIds,
  displayOptions,
}: UseCorrelationDataProps): UseCorrelationDataResult {
  // Get compatible questions for correlation analysis
  const compatibleQuestions = useMemo(
    () => getCompatibleQuestions(flowQuestions),
    [flowQuestions]
  )

  // Pre-extract data for all questions
  const questionData = useMemo(() => {
    const data = new Map<string, ReturnType<typeof extractQuestionData>>()

    for (const question of compatibleQuestions) {
      data.set(
        question.id,
        extractQuestionData(
          question.id,
          question,
          flowResponses,
          filteredParticipantIds
        )
      )
    }

    return data
  }, [compatibleQuestions, flowResponses, filteredParticipantIds])

  // Compute correlation matrix
  const matrixData = useMemo<CorrelationMatrixData | null>(() => {
    if (compatibleQuestions.length < 2) {
      return null
    }

    const pairs = new Map<string, CorrelationPair>()

    // Compute correlation for each unique pair
    for (let i = 0; i < compatibleQuestions.length; i++) {
      for (let j = i + 1; j < compatibleQuestions.length; j++) {
        const q1 = compatibleQuestions[i]
        const q2 = compatibleQuestions[j]

        const data1 = questionData.get(q1.id) || []
        const data2 = questionData.get(q2.id) || []

        const paired = getPairedData(data1, data2)

        // Skip if not enough paired data
        if (paired.n < displayOptions.minSampleSize) {
          continue
        }

        // Determine correlation method based on data types
        const dataType1 = mapToCorrelationDataType(q1.dataType, paired.x)
        const dataType2 = mapToCorrelationDataType(q2.dataType, paired.y)
        const method = selectCorrelationMethod(dataType1, dataType2)

        // Calculate correlation
        const result = calculateCorrelation(paired.x, paired.y, method)

        // Skip non-significant if option is set
        if (displayOptions.showSignificanceOnly && !result.isSignificant) {
          continue
        }

        const pairKey = getPairKey(q1.id, q2.id)
        pairs.set(pairKey, {
          question1Id: q1.id,
          question2Id: q2.id,
          result,
        })
      }
    }

    return {
      questions: compatibleQuestions,
      pairs,
    }
  }, [compatibleQuestions, questionData, displayOptions])

  return {
    compatibleQuestions,
    matrixData,
  }
}
