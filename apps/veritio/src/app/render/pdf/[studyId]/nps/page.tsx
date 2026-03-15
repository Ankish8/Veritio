'use client'

/**
 * PDF Render Page - NPS Analysis
 *
 * Renders NPS (Net Promoter Score) analysis for PDF capture.
 * This page is accessed by Puppeteer via a short-lived token.
 */

import { useEffect, useState } from 'react'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'

interface NPSRenderProps {
  params: Promise<{ studyId: string }>
  searchParams: Promise<{ token?: string }>
}

interface NPSData {
  promoters: number
  passives: number
  detractors: number
  score: number
  total: number
}

function calculateNPS(
  questions: StudyFlowQuestionRow[],
  responses: StudyFlowResponseRow[]
): NPSData | null {
  // Find NPS questions (scale 0-10 with NPS type)
  const npsQuestions = questions.filter(
    (q) => q.question_type === 'nps' || q.question_type === 'rating_scale'
  )

  if (npsQuestions.length === 0) return null

  let promoters = 0
  let passives = 0
  let detractors = 0

  for (const question of npsQuestions) {
    const questionResponses = responses.filter((r) => r.question_id === question.id)

    for (const response of questionResponses) {
      const value = Number(response.response_value)
      if (isNaN(value)) continue

      if (value >= 9) {
        promoters++
      } else if (value >= 7) {
        passives++
      } else {
        detractors++
      }
    }
  }

  const total = promoters + passives + detractors
  const score = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0

  return { promoters, passives, detractors, score, total }
}

export default function NPSRenderPage({
  params,
  searchParams,
}: NPSRenderProps) {
  const [npsData, setNpsData] = useState<NPSData | null>(null)
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
        const data = calculateNPS(result.flowQuestions || [], result.flowResponses || [])

        if (!data || data.total === 0) {
          setError('No NPS data available')
          setLoading(false)
          return
        }

        setNpsData(data)
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
    if (!loading && (npsData || error)) {
      const timer = setTimeout(() => {
        ;(window as unknown as { __PDF_READY__: boolean }).__PDF_READY__ = true
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, npsData, error])

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
        Loading NPS analysis...
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

  if (!npsData) {
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
        No NPS data available
      </div>
    )
  }

  const promoterPercent = Math.round((npsData.promoters / npsData.total) * 100)
  const passivePercent = Math.round((npsData.passives / npsData.total) * 100)
  const detractorPercent = Math.round((npsData.detractors / npsData.total) * 100)

  return (
    <div data-pdf-chart="nps-analysis" data-pdf-title="Net Promoter Score">
      <div style={{ padding: '20px' }}>
        {/* NPS Score */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: npsData.score >= 50 ? '#22c55e' : npsData.score >= 0 ? '#eab308' : '#ef4444',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{npsData.score}</div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>NPS Score</div>
          </div>
        </div>

        {/* Breakdown */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginBottom: '30px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#22c55e' }}>
              {npsData.promoters}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              Promoters ({promoterPercent}%)
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Score 9-10</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#eab308' }}>
              {npsData.passives}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              Passives ({passivePercent}%)
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Score 7-8</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>
              {npsData.detractors}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              Detractors ({detractorPercent}%)
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Score 0-6</div>
          </div>
        </div>

        {/* Bar visualization */}
        <div
          style={{
            display: 'flex',
            height: '40px',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${promoterPercent}%`,
              background: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            {promoterPercent > 10 && `${promoterPercent}%`}
          </div>
          <div
            style={{
              width: `${passivePercent}%`,
              background: '#eab308',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            {passivePercent > 10 && `${passivePercent}%`}
          </div>
          <div
            style={{
              width: `${detractorPercent}%`,
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            {detractorPercent > 10 && `${detractorPercent}%`}
          </div>
        </div>

        <div
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '14px',
            color: '#64748b',
          }}
        >
          Based on {npsData.total} responses
        </div>
      </div>
    </div>
  )
}
