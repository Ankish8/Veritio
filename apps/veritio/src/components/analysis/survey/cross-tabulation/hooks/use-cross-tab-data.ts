import { useMemo } from 'react'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { stripPipingHtml } from '@/lib/utils'
import type { CrossTabData, CrossTabQuestion, StatisticalTestResult } from '../types'
import { QUESTION_TYPE_TO_DATA_TYPE, isQuestionTypeCompatible } from '../types'
import { extractResponseValues, getQuestionCategories } from '../utils/response-extraction'
import { buildCrossTabData, calculateChiSquare, shouldUseFisherExact, fisherExactTest } from '@/lib/algorithms/cross-tabulation'

interface UseCrossTabDataParams {
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  filteredParticipantIds: Set<string> | null
  rowQuestionId: string | null
  colQuestionId: string | null
}

interface UseCrossTabDataResult {
  compatibleQuestions: CrossTabQuestion[]
  crossTabData: CrossTabData | null
  statisticalResult: StatisticalTestResult | null
}

export function useCrossTabData({
  flowQuestions,
  flowResponses,
  filteredParticipantIds,
  rowQuestionId,
  colQuestionId,
}: UseCrossTabDataParams): UseCrossTabDataResult {

  const surveyQuestions = useMemo(() => {
    return flowQuestions.filter(q => q.section === 'survey')
  }, [flowQuestions])

  const compatibleQuestions = useMemo((): CrossTabQuestion[] => {
    return surveyQuestions.map(q => {
      const dataType = QUESTION_TYPE_TO_DATA_TYPE[q.question_type] || 'text'
      const isCompatible = isQuestionTypeCompatible(q.question_type)
      const { labels, values } = getQuestionCategories(q)
      const responseCount = flowResponses.filter(r =>
        r.question_id === q.id &&
        (filteredParticipantIds === null || filteredParticipantIds.has(r.participant_id))
      ).length

      return {
        id: q.id,
        text: stripPipingHtml(q.question_text),
        type: q.question_type,
        section: q.section,
        dataType,
        isCompatible,
        incompatibilityReason: !isCompatible ? getIncompatibilityReason(dataType) : undefined,
        categoryLabels: labels,
        categoryValues: values,
        responseCount,
      }
    })
  }, [surveyQuestions, flowResponses, filteredParticipantIds])

  const crossTabData = useMemo((): CrossTabData | null => {
    if (!rowQuestionId || !colQuestionId || rowQuestionId === colQuestionId) return null

    const rowQuestion = surveyQuestions.find(q => q.id === rowQuestionId)
    const colQuestion = surveyQuestions.find(q => q.id === colQuestionId)
    if (!rowQuestion || !colQuestion) return null

    const { labels: rowLabels, values: rowValues } = getQuestionCategories(rowQuestion)
    const { labels: colLabels, values: colValues } = getQuestionCategories(colQuestion)
    if (rowLabels.length === 0 || colLabels.length === 0) return null

    const filteredResponses = filteredParticipantIds === null
      ? flowResponses
      : flowResponses.filter(r => filteredParticipantIds.has(r.participant_id))

    const { rowMap, colMap } = buildResponseMaps(filteredResponses, rowQuestionId, colQuestionId, rowQuestion, colQuestion)
    const counts = buildCountMatrix(rowMap, colMap, rowValues, colValues)

    return buildCrossTabData(counts, rowLabels, colLabels, rowQuestionId, colQuestionId, stripPipingHtml(rowQuestion.question_text), stripPipingHtml(colQuestion.question_text))
  }, [rowQuestionId, colQuestionId, surveyQuestions, flowResponses, filteredParticipantIds])

  const statisticalResult = useMemo((): StatisticalTestResult | null => {
    if (!crossTabData) return null
    return computeStatisticalTest(crossTabData)
  }, [crossTabData])

  return { compatibleQuestions, crossTabData, statisticalResult }
}

function getIncompatibilityReason(dataType: string): string {
  if (dataType === 'text') return 'Text questions cannot be cross-tabulated'
  if (dataType === 'complex') return 'Matrix and ranking questions are not supported'
  return 'Unsupported question type'
}

function buildResponseMaps(
  responses: StudyFlowResponseRow[],
  rowQuestionId: string,
  colQuestionId: string,
  rowQuestion: StudyFlowQuestionRow,
  colQuestion: StudyFlowQuestionRow
) {
  const rowMap = new Map<string, string[]>()
  const colMap = new Map<string, string[]>()

  for (const response of responses) {
    if (response.question_id === rowQuestionId) {
      const values = extractResponseValues(response.response_value, rowQuestion)
      if (values.length > 0) rowMap.set(response.participant_id, values)
    } else if (response.question_id === colQuestionId) {
      const values = extractResponseValues(response.response_value, colQuestion)
      if (values.length > 0) colMap.set(response.participant_id, values)
    }
  }

  return { rowMap, colMap }
}

function buildCountMatrix(
  rowMap: Map<string, string[]>,
  colMap: Map<string, string[]>,
  rowValues: string[],
  colValues: string[]
): number[][] {
  const counts = rowValues.map(() => colValues.map(() => 0))

  for (const [participantId, rowVals] of rowMap) {
    const colVals = colMap.get(participantId)
    if (!colVals) continue

    for (const rowVal of rowVals) {
      for (const colVal of colVals) {
        const rowIdx = rowValues.indexOf(rowVal)
        const colIdx = colValues.indexOf(colVal)
        if (rowIdx >= 0 && colIdx >= 0) counts[rowIdx][colIdx]++
      }
    }
  }

  return counts
}

function computeStatisticalTest(crossTabData: CrossTabData): StatisticalTestResult {
  const { grandTotal, cells } = crossTabData
  const rows = cells.length
  const cols = cells[0]?.length || 0

  if (grandTotal < 5) {
    return { type: 'insufficient_data', message: 'Not enough responses (minimum 5 required)' }
  }
  if (rows < 2 || cols < 2) {
    return { type: 'insufficient_data', message: 'Need at least 2 categories in each question' }
  }

  if (shouldUseFisherExact(crossTabData)) {
    const [[a, b], [c, d]] = [[cells[0][0].count, cells[0][1].count], [cells[1][0].count, cells[1][1].count]]
    return { type: 'fisher_exact', result: fisherExactTest(a, b, c, d) }
  }

  return { type: 'chi_square', result: calculateChiSquare(crossTabData) }
}
