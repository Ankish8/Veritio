/**
 * Flow Labels
 *
 * Pathway label maps for V3 component state labeling.
 * Derives display labels from SuccessPathway definitions so the flow diagram
 * matches the Participant Paths breadcrumb exactly.
 */

import type { SuccessPathway } from '../../lib/supabase/study-flow-types'
import { getPathsV3FromPathway, pathwayHasStateSteps } from '../../lib/utils/pathway-migration'
export interface PathwayLabelMaps {
  labels: Map<string, string>
  componentNames: Map<string, string>
  componentIds: Set<string>
  variantIds: Set<string>
}
export function buildPathwayLabelMaps(rawPathway: unknown): PathwayLabelMaps | null {
  if (!rawPathway) return null
  const pathway = rawPathway as SuccessPathway
  if (!pathwayHasStateSteps(pathway)) return null

  const labels = new Map<string, string>()
  const componentNames = new Map<string, string>()

  const paths = getPathsV3FromPathway(pathway)
  for (const path of paths) {
    for (const step of path.steps) {
      if (step.type !== 'state') continue

      // Build display label — same format as buildVariantLabelMap in paths-utils.ts
      let label: string
      if (step.customLabel) {
        label = step.customLabel
      } else if (step.componentName && step.variantName) {
        // Parse "Property=Value" → "Value" (Figma format)
        const eqIndex = step.variantName.lastIndexOf('=')
        const value = eqIndex >= 0 ? step.variantName.slice(eqIndex + 1).trim() : step.variantName
        label = `${step.componentName}: ${value}`
      } else {
        label = step.componentName || 'Interaction'
      }

      labels.set(step.variantId, label)
      if (step.componentName) {
        componentNames.set(step.componentNodeId, step.componentName)
      }
    }
  }

  if (labels.size === 0) return null

  return {
    labels,
    componentNames,
    componentIds: new Set(componentNames.keys()),
    variantIds: new Set(labels.keys()),
  }
}
