/**
 * Centralized Color Constants
 *
 * All semantic color values used across charts, visualizations, and UI components.
 * Import from `@veritio/core/colors` in packages or `@/lib/colors` in the app.
 */

// ---------------------------------------------------------------------------
// Status colors — success / failure / warning / skipped / destructive
// ---------------------------------------------------------------------------
export const STATUS_COLORS = {
  success: '#10b981',        // emerald-500
  successDark: '#16a34a',    // green-600
  successLight: '#4ade80',   // green-400
  successBright: '#22c55e',  // green-500
  failure: '#ef4444',        // red-500
  failureLight: '#f87171',   // red-400
  failureRose: '#f43f5e',    // rose-500
  destructive: '#DC2626',    // red-600
  warning: '#f59e0b',        // amber-500
  skipped: '#94a3b8',        // slate-400
  neutral: '#d1d5db',        // gray-300
  neutralDark: '#9ca3af',    // gray-400
} as const

// ---------------------------------------------------------------------------
// Chart colors — Recharts axis strokes, grid lines, tick fills, labels
// ---------------------------------------------------------------------------
export const CHART_COLORS = {
  axisStroke: '#e5e7eb',     // gray-200 — grid lines & axis separator
  tickFill: '#71717a',       // zinc-500 — axis tick labels
  referenceLine: '#888',     // gray — center/reference lines
  labelFill: '#6b7280',      // gray-500 — axis label text
  barDefault: '#71717a',     // zinc-500 — default bar fill (e.g. card-sort)
} as const

// ---------------------------------------------------------------------------
// Spatial overlay colors — SDD circle, deviational ellipse, mean center
// ---------------------------------------------------------------------------
export const SPATIAL_COLORS = {
  sddStroke: '#6366f1',                    // indigo-500
  sddFill: 'rgba(99, 102, 241, 0.08)',
  ellipseStroke: '#f59e0b',                // amber-500
  ellipseFill: 'rgba(245, 158, 11, 0.08)',
  meanCenterStroke: '#ef4444',             // red-500
  clusterText: '#fff',
} as const

// ---------------------------------------------------------------------------
// AOI (Area of Interest) palette — 8-color rotation for AOI overlays
// ---------------------------------------------------------------------------
export const AOI_PALETTE = [
  { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.12)' },   // blue
  { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.12)' },   // violet
  { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.12)' },    // cyan
  { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.12)' },   // amber
  { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.12)' },    // emerald
  { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.12)' },     // red
  { stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.12)' },    // pink
  { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.12)' },    // orange
] as const

// ---------------------------------------------------------------------------
// Visualization accent colors — selection borders, indigo/blue accents
// ---------------------------------------------------------------------------
export const VIZ_COLORS = {
  selectionBorder: 'rgba(59, 130, 246, 0.6)',
  selectionBg: 'rgba(59, 130, 246, 0.08)',
  selectionShadow: 'rgba(0, 0, 0, 0.15)',
  indigo: '#6366f1',         // indigo-500 — QR codes, accents
  waveform: '#94a3b8',       // slate-400
  waveformProgress: '#3b82f6', // blue-500
} as const

// ---------------------------------------------------------------------------
// Flow diagram node fills — rgba backgrounds for flow visualization nodes
// ---------------------------------------------------------------------------
export const FLOW_NODE_FILLS = {
  componentState: 'rgba(139, 92, 246, 0.3)',  // violet
  start: 'rgba(59, 130, 246, 0.15)',           // blue
  success: 'rgba(34, 197, 94, 0.15)',          // green
  deadEnd: 'rgba(239, 68, 68, 0.15)',          // red
  regular: 'rgba(107, 114, 128, 0.15)',        // gray
  backtrack: '#f59e0b',                        // amber-500
} as const

// ---------------------------------------------------------------------------
// NPS gauge chart — zone backgrounds
// ---------------------------------------------------------------------------
export const NPS_GAUGE_COLORS = {
  background: '#e5e7eb',     // gray-200
  detractor: '#fee2e2',      // red-100
  passive: '#fef3c7',        // amber-100
  promoter: '#dcfce7',       // green-100
  label: '#6b7280',          // gray-500
} as const

// ---------------------------------------------------------------------------
// Overlay / backdrop colors — shadows, semi-transparent overlays
// ---------------------------------------------------------------------------
export const OVERLAY_COLORS = {
  backdropLight: 'rgba(0, 0, 0, 0.10)',
  backdropMedium: 'rgba(0, 0, 0, 0.5)',
  shadowXs: 'rgba(0, 0, 0, 0.06)',
  shadowSm: 'rgba(0, 0, 0, 0.08)',
  shadowMd: 'rgba(0, 0, 0, 0.10)',
  shadowLg: 'rgba(0, 0, 0, 0.12)',
  shadowText: 'rgba(0, 0, 0, 0.7)',
  white: '#fff',
  whiteSoft: 'rgba(255, 255, 255, 0.3)',
  whiteMedium: 'rgba(255, 255, 255, 0.6)',
  whiteBright: 'rgba(255, 255, 255, 0.8)',
} as const

// ---------------------------------------------------------------------------
// Completion donut colors
// ---------------------------------------------------------------------------
export const COMPLETION_COLORS = {
  completed: '#10b981',      // emerald-500
  abandoned: '#e5e7eb',      // gray-200
} as const

// ---------------------------------------------------------------------------
// Grid renderer gradient stops (click-map density overlay)
// ---------------------------------------------------------------------------
export const GRID_GRADIENT_STOPS = [
  { r: 59, g: 130, b: 246, a: 0.10 },  // blue
  { r: 6, g: 182, b: 212, a: 0.35 },   // cyan
  { r: 16, g: 185, b: 129, a: 0.50 },   // green
  { r: 245, g: 158, b: 11, a: 0.60 },   // amber
  { r: 239, g: 68, b: 68, a: 0.70 },    // red
] as const

export const GRID_GRADIENT_CSS =
  'linear-gradient(to right, rgba(59,130,246,0.15), rgba(6,182,212,0.4), rgba(16,185,129,0.55), rgba(245,158,11,0.65), rgba(239,68,68,0.75))'

// ---------------------------------------------------------------------------
// Matrix column colors — rotating palette for grouped/stacked bar charts
// ---------------------------------------------------------------------------
export const MATRIX_COLUMN_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
] as const

// ---------------------------------------------------------------------------
// Gradient stops (decorative)
// ---------------------------------------------------------------------------
export const GRADIENT_COLORS = {
  emerald: '#34d399',        // emerald-400
  amber: '#f59e0b',          // amber-500
} as const

// ---------------------------------------------------------------------------
// Box shadow presets
// ---------------------------------------------------------------------------
export const BOX_SHADOWS = {
  taskBar: '0 4px 20px rgba(0,0,0,0.10), 0 1px 6px rgba(0,0,0,0.06)',
  taskPanel: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
} as const

// ---------------------------------------------------------------------------
// Likert/diverging bar colors
// ---------------------------------------------------------------------------
export const LIKERT_COLORS = {
  positive: '#22c55e',       // green-500
  negative: '#ef4444',       // red-500
  neutral: '#9ca3af',        // gray-400
} as const
