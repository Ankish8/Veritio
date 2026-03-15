'use client'

/**
 * PDF Render Page - Dendrogram
 *
 * Renders the dendrogram chart for PDF capture.
 * This page is accessed by Puppeteer via a short-lived token.
 */

import { useEffect, useState } from 'react'
import { DendrogramVisualization } from '@/components/analysis/card-sort/dendrogram'
import type { DendrogramNode, LinkageMethod } from '@/lib/algorithms/hierarchical-clustering'

interface DendrogramRenderProps {
  params: Promise<{ studyId: string }>
  searchParams: Promise<{ token?: string }>
}

export default function DendrogramRenderPage({
  params,
  searchParams,
}: DendrogramRenderProps) {
  const [data, setData] = useState<DendrogramNode | null>(null)
  const [suggestedClusters, setSuggestedClusters] = useState<number>(3)
  const [method, setMethod] = useState<LinkageMethod | undefined>(undefined)
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

        if (!result.analysis?.dendrogram) {
          setError('No dendrogram data available')
          setLoading(false)
          return
        }

        setData(result.analysis.dendrogram)
        setSuggestedClusters(result.analysis.suggestedClusters?.count || 3)
        setMethod(result.analysis.dendrogramMethod)
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
      // Wait for D3 to finish rendering
      const timer = setTimeout(() => {
        ;(window as unknown as { __PDF_READY__: boolean }).__PDF_READY__ = true
      }, 1000)
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
        Loading dendrogram...
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
    <div data-pdf-chart="dendrogram" data-pdf-title="Dendrogram">
      <DendrogramVisualization
        data={data}
        suggestedClusters={suggestedClusters}
        method={method}
      />
    </div>
  )
}
