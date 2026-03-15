'use client'

/**
 * PDF Render Page - Results Matrix
 *
 * Renders the results matrix (card-to-category placements) for PDF capture.
 */

import { useEffect, useState } from 'react'
import { ResultsMatrix } from '@/components/analysis/card-sort/results-matrix'

interface Card {
  id: string
  label: string
  description?: string | null
}

interface Category {
  id: string
  label: string
  description?: string | null
}

interface Response {
  participant_id: string
  card_placements: Record<string, string>
}

interface ResultsMatrixRenderProps {
  params: Promise<{ studyId: string }>
  searchParams: Promise<{ token?: string }>
}

export default function ResultsMatrixRenderPage({
  params,
  searchParams,
}: ResultsMatrixRenderProps) {
  const [cards, setCards] = useState<Card[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [responses, setResponses] = useState<Response[]>([])
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

        // Fetch results data from API
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

        if (!result.cards || !result.categories) {
          setError('No card/category data available')
          setLoading(false)
          return
        }

        setCards(result.cards)
        setCategories(result.categories)
        setResponses(result.responses || [])
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
    if (!loading && ((cards.length > 0 && categories.length > 0) || error)) {
      const timer = setTimeout(() => {
        ;(window as unknown as { __PDF_READY__: boolean }).__PDF_READY__ = true
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, cards, categories, error])

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
        Loading results matrix...
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

  if (cards.length === 0 || categories.length === 0) {
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
    <div data-pdf-chart="results-matrix" data-pdf-title="Results Matrix">
      <ResultsMatrix
        cards={cards}
        categories={categories}
        responses={responses}
      />
    </div>
  )
}
