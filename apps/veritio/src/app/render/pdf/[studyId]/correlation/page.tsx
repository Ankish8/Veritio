'use client'

/**
 * PDF Render Page - Correlation Matrix
 *
 * Renders the survey correlation matrix for PDF capture.
 */

import { useEffect, useState, useMemo } from 'react'
import {
  CorrelationMatrix,
  useCorrelationData,
  DEFAULT_DISPLAY_OPTIONS,
} from '@/components/analysis/survey/correlation'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'

interface CorrelationRenderProps {
  params: Promise<{ studyId: string }>
  searchParams: Promise<{ token?: string }>
}

export default function CorrelationRenderPage({
  params,
  searchParams,
}: CorrelationRenderProps) {
  const [flowQuestions, setFlowQuestions] = useState<StudyFlowQuestionRow[]>([])
  const [flowResponses, setFlowResponses] = useState<StudyFlowResponseRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const { studyId } = await params
        const { token } = await searchParams

        if (!token) {
          setError('Missing access token')
          setLoading(false)
          return
        }

        // Fetch survey results data from API
        const response = await fetch(`/api/studies/${studyId}/survey-results`, {
          headers: {
            'X-PDF-Render-Token': token,
          },
        })

        if (!response.ok) {
          const errData = await response.json()
          setError(errData.message || 'Failed to fetch data')
          setLoading(false)
          return
        }

        const result = await response.json()

        setFlowQuestions(result.flowQuestions || [])
        setFlowResponses(result.flowResponses || [])
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    loadData()
  }, [params, searchParams])

  // Compute correlation data using the hook
  const displayOptions = useMemo(
    () => ({ ...DEFAULT_DISPLAY_OPTIONS, showCoefficients: true }),
    []
  )

  const { matrixData } = useCorrelationData({
    flowQuestions,
    flowResponses,
    filteredParticipantIds: null,
    displayOptions,
  })

  // Signal ready when component is rendered
  useEffect(() => {
    if (!loading && (matrixData || error || flowQuestions.length < 2)) {
      const timer = setTimeout(() => {
        ;(window as unknown as { __PDF_READY__: boolean }).__PDF_READY__ = true
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, matrixData, error, flowQuestions])

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '600px',
          color: '#64748b',
        }}
      >
        Loading correlation matrix...
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '600px',
          color: '#ef4444',
        }}
      >
        Error: {error}
      </div>
    )
  }

  if (!matrixData || flowQuestions.length < 2) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '600px',
          color: '#64748b',
        }}
      >
        Not enough compatible questions for correlation analysis
      </div>
    )
  }

  return (
    <div data-pdf-chart="correlation" data-pdf-title="Correlation Matrix">
      <CorrelationMatrix data={matrixData} displayOptions={displayOptions} />
    </div>
  )
}
