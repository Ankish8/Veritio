'use client'

/**
 * PDF Render Page - Similarity Matrix
 *
 * Renders the similarity matrix chart for PDF capture.
 */

import { useEffect, useState } from 'react'
import { SimilarityMatrix } from '@/components/analysis/card-sort/similarity-matrix'
import type { SimilarityResult } from '@/lib/algorithms/similarity-matrix'

interface SimilarityMatrixRenderProps {
  params: Promise<{ studyId: string }>
  searchParams: Promise<{ token?: string }>
}

export default function SimilarityMatrixRenderPage({
  params,
  searchParams,
}: SimilarityMatrixRenderProps) {
  const [data, setData] = useState<SimilarityResult | null>(null)
  const [optimalOrder, setOptimalOrder] = useState<string[]>([])
  const [participantCount, setParticipantCount] = useState<number>(0)
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

        // Fetch analysis data from API
        const response = await fetch(`/api/studies/${studyId}/results`, {
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

        if (!result.analysis?.similarityMatrix) {
          setError('No similarity matrix data available')
          setLoading(false)
          return
        }

        setData(result.analysis.similarityMatrix)
        setOptimalOrder(result.analysis.optimalOrder || [])
        setParticipantCount(result.totalParticipants || 0)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    loadData()
  }, [params, searchParams])

  // Signal ready when component is rendered
  useEffect(() => {
    if (!loading && (data || error)) {
      const timer = setTimeout(() => {
        ;(window as unknown as { __PDF_READY__: boolean }).__PDF_READY__ = true
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, data, error])

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
        Loading similarity matrix...
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

  if (!data) {
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
        No data available
      </div>
    )
  }

  return (
    <div data-pdf-chart="similarity-matrix" data-pdf-title="Similarity Matrix">
      <SimilarityMatrix
        data={data}
        optimalOrder={optimalOrder}
        participantCount={participantCount}
      />
    </div>
  )
}
