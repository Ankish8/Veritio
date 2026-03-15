/**
 * Zod schemas for AI-generated chart configurations and report sections.
 * The LLM returns JSON matching these schemas; React interprets them into Recharts renders.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Chart config — describes a single chart the AI wants to render
// ---------------------------------------------------------------------------

export const chartTypeSchema = z.enum([
  'bar',
  'pie',
  'line',
  'horizontal_bar',
  'stacked_bar',
  'grouped_bar',
])

export type ChartType = z.infer<typeof chartTypeSchema>

export const chartDataPointSchema = z.record(z.union([z.string(), z.number()]))

export const chartConfigSchema = z.object({
  type: chartTypeSchema,
  title: z.string(),
  data: z.array(chartDataPointSchema),
  xKey: z.string(),
  yKeys: z.array(z.string()).min(1),
  colors: z.array(z.string()).optional(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
})

export type ChartConfig = z.infer<typeof chartConfigSchema>

// ---------------------------------------------------------------------------
// Section output — one section of the report
// ---------------------------------------------------------------------------

export const sectionOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  narrative: z.string(), // markdown
  keyFindings: z.array(z.string()),
  charts: z.array(chartConfigSchema).max(3),
  recommendations: z.array(z.string()).optional(),
})

export type SectionOutput = z.infer<typeof sectionOutputSchema>

// ---------------------------------------------------------------------------
// Full report output from the LLM orchestration
// ---------------------------------------------------------------------------

export const reportOutputSchema = z.object({
  executiveSummary: z.string(),
  sections: z.array(sectionOutputSchema),
})

export type ReportOutput = z.infer<typeof reportOutputSchema>

// ---------------------------------------------------------------------------
// DB row shape
// ---------------------------------------------------------------------------

export interface InsightsReport {
  id: string
  study_id: string
  user_id: string
  status: 'processing' | 'completed' | 'failed'
  report_data: ReportOutput | null
  response_count_at_generation: number
  segment_filters: unknown[]
  file_path: string | null
  progress: { percentage: number; currentSection: string }
  error_message: string | null
  model_used: string | null
  token_usage: { promptTokens: number; completionTokens: number } | null
  generation_time_ms: number | null
  created_at: string
  completed_at: string | null
  updated_at: string
}
