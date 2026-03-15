'use client'

/**
 * PDF Render Page - AI Insights Report
 *
 * Hidden page for Puppeteer PDF capture. Renders the full insights report
 * with non-lazy Recharts components. Signals ready via window.__PDF_READY__.
 */

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { ReportOutput, SectionOutput, ChartConfig } from '@/services/insights/chart-schema'

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1',
]

interface InsightsRenderProps {
  params: Promise<{ studyId: string }>
  searchParams: Promise<{ token?: string; reportId?: string }>
}

export default function InsightsRenderPage({
  params,
  searchParams,
}: InsightsRenderProps) {
  const [reportData, setReportData] = useState<ReportOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const { studyId } = await params
        const { token, reportId } = await searchParams

        if (!token || !reportId) {
          setError('Missing token or reportId')
          setLoading(false)
          return
        }

        const response = await fetch(
          `/api/studies/${studyId}/insights/${reportId}`,
          { headers: { 'X-PDF-Render-Token': token } },
        )

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          setError(err.error || 'Failed to fetch report')
          setLoading(false)
          return
        }

        const data = await response.json()
        setReportData(data.report?.report_data ?? null)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    loadData()
  }, [params, searchParams])

  // Signal ready for Puppeteer capture
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        ;(window as unknown as { __PDF_READY__: boolean }).__PDF_READY__ = true
      }, 1000) // Extra delay for chart animations to settle
      return () => clearTimeout(timer)
    }
  }, [loading])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '600px', color: '#64748b' }}>
        Loading insights report...
      </div>
    )
  }

  if (error || !reportData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '600px', color: '#ef4444' }}>
        Error: {error || 'No report data'}
      </div>
    )
  }

  return (
    <div data-pdf-chart="insights" data-pdf-title="AI Insights Report">
      {/* Executive Summary */}
      {reportData.executiveSummary && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Executive Summary</h2>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#475569', whiteSpace: 'pre-line' }}>
            {reportData.executiveSummary}
          </p>
        </div>
      )}

      {/* Sections */}
      {reportData.sections.map((section) => (
        <RenderSection key={section.id} section={section} />
      ))}
    </div>
  )
}

function RenderSection({ section }: { section: SectionOutput }) {
  return (
    <div style={{ marginBottom: 28, pageBreakInside: 'avoid' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
        {section.title}
      </h3>

      <p style={{ fontSize: 12, lineHeight: 1.6, color: '#475569', whiteSpace: 'pre-line', marginBottom: 12 }}>
        {section.narrative}
      </p>

      {/* Charts - non-lazy direct Recharts */}
      {section.charts.map((chart, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <RenderChart config={chart} />
        </div>
      ))}

      {/* Key findings */}
      {section.keyFindings.length > 0 && (
        <div style={{ background: '#f8fafc', borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Key Findings</div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {section.keyFindings.map((finding, i) => (
              <li key={i} style={{ fontSize: 11, lineHeight: 1.5, color: '#475569', marginBottom: 4 }}>
                {finding}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {section.recommendations && section.recommendations.length > 0 && (
        <div style={{ background: '#eff6ff', borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8', marginBottom: 6 }}>Recommendations</div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {section.recommendations.map((rec, i) => (
              <li key={i} style={{ fontSize: 11, lineHeight: 1.5, color: '#1e40af', marginBottom: 4 }}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function RenderChart({ config }: { config: ChartConfig }) {
  const colors = config.colors?.length ? config.colors : CHART_COLORS

  if (config.type === 'pie') {
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{config.title}</div>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={config.data}
              dataKey={config.yKeys[0]}
              nameKey={config.xKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {config.data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (config.type === 'line') {
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{config.title}</div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={config.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} tick={{ fontSize: 11 }} label={config.xLabel ? { value: config.xLabel, position: 'insideBottom', offset: -5 } : undefined} />
            <YAxis tick={{ fontSize: 11 }} label={config.yLabel ? { value: config.yLabel, angle: -90, position: 'insideLeft' } : undefined} />
            <Tooltip />
            <Legend />
            {config.yKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Bar variants: bar, horizontal_bar, stacked_bar, grouped_bar
  const isHorizontal = config.type === 'horizontal_bar'
  const isStacked = config.type === 'stacked_bar'

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{config.title}</div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={config.data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
        >
          <CartesianGrid strokeDasharray="3 3" />
          {isHorizontal ? (
            <>
              <XAxis type="number" tick={{ fontSize: 11 }} label={config.yLabel ? { value: config.yLabel, position: 'insideBottom', offset: -5 } : undefined} />
              <YAxis dataKey={config.xKey} type="category" tick={{ fontSize: 11 }} width={120} label={config.xLabel ? { value: config.xLabel, angle: -90, position: 'insideLeft' } : undefined} />
            </>
          ) : (
            <>
              <XAxis dataKey={config.xKey} tick={{ fontSize: 11 }} label={config.xLabel ? { value: config.xLabel, position: 'insideBottom', offset: -5 } : undefined} />
              <YAxis tick={{ fontSize: 11 }} label={config.yLabel ? { value: config.yLabel, angle: -90, position: 'insideLeft' } : undefined} />
            </>
          )}
          <Tooltip />
          <Legend />
          {config.yKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[i % colors.length]}
              stackId={isStacked ? 'stack' : undefined}
              radius={isStacked ? undefined : [2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
