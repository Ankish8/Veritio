/**
 * Colorblind-safe color scheme definitions for D3 visualizations.
 *
 * All scale names correspond to d3-scale-chromatic interpolators.
 */

export const COLOR_SCALE_NAMES = {
  viridis: 'interpolateViridis',
  turbo: 'interpolateTurbo',
  magma: 'interpolateMagma',
  plasma: 'interpolatePlasma',
} as const

export type ColorSchemeName = keyof typeof COLOR_SCALE_NAMES

/**
 * ~10 distinct, colorblind-safe colors for DBSCAN cluster boundaries.
 * Derived from Tableau10 with manual adjustments for perceptual distinctness.
 */
export const CLUSTER_COLORS = [
  '#4e79a7', // steel blue
  '#f28e2b', // orange
  '#e15759', // red
  '#76b7b2', // teal
  '#59a14f', // green
  '#edc948', // yellow
  '#b07aa1', // purple
  '#ff9da7', // pink
  '#9c755f', // brown
  '#bab0ac', // grey
] as const
