// =============================================================================
// PATHWAY VALIDATION UTILITIES
// Type-safe pathway format detection and validation
// =============================================================================

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasValidV3Path(path: unknown): boolean {
  if (!isObject(path)) return false
  const hasFrames = Array.isArray(path.frames) && path.frames.length >= 2
  const hasSteps = Array.isArray(path.steps) && path.steps.length >= 1
  return hasFrames || hasSteps
}

function hasValidV2Path(path: unknown): boolean {
  if (!isObject(path)) return false
  return Array.isArray(path.frames) && path.frames.length >= 2
}

/**
 * Check if a pathway object (any version format) contains valid path data.
 * Supports v3 (steps+frames), v2 (versioned paths), v1 (frames+strict), and legacy array format.
 */
export function hasValidPathway(pathway: unknown): boolean {
  if (!isObject(pathway)) {
    // Legacy array format
    return Array.isArray(pathway) && pathway.length >= 2
  }

  // v3 format: { version: 3, paths: [{ steps: [...], frames: [...] }] }
  if (pathway.version === 3) {
    const paths = pathway.paths
    return Array.isArray(paths) && paths.some(hasValidV3Path)
  }

  // v2 format: { version: 2, paths: [...] }
  if (pathway.version === 2) {
    const paths = pathway.paths
    return Array.isArray(paths) && paths.some(hasValidV2Path)
  }

  // v1 format: { frames: [...], strict: boolean }
  if ('frames' in pathway && Array.isArray(pathway.frames)) {
    return pathway.frames.length >= 2
  }

  return false
}
