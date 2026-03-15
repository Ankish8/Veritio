/**
 * Pathway Migration Utilities
 *
 * Barrel file that re-exports the public API from split modules:
 * - pathway-conversion: Migration, normalization, format conversion
 * - pathway-creation: Creating/modifying paths, steps, and pathways
 * - pathway-queries: Read-only query/utility functions
 *
 * All existing imports from this file continue to work unchanged.
 */

// Conversion: migration, normalization, format transforms
export {
  generatePathName,
  framesToSteps,
  stepsToFrames,
  normalizeStepsForDisplay,
  stepsToPositionFrames,
  migratePathway,
  migratePathwayToV3,
  normalizePathway,
  normalizePathwayV3,
} from './pathway-conversion'

// Creation: creating and modifying paths, steps, pathways
export {
  createFrameStep,
  createStateStep,
  createPath,
  createPathV3,
  addPathToPathway,
  addPathToPathwayV3,
  updatePathInPathway,
  updatePathInPathwayV3,
  removePathFromPathway,
  removePathFromPathwayV3,
  setPathAsPrimary,
  reorderPathsInPathway,
  addStepToPath,
  removeStepFromPath,
  updateStepInPath,
  reorderStepsInPath,
} from './pathway-creation'

// Queries: read-only inspection and utility functions
export {
  getPathsFromPathway,
  getPathsV3FromPathway,
  getPrimaryPath,
  getPrimaryPathV3,
  getPrimaryPathFrames,
  hasValidPaths,
  hasValidPathsV3,
  getPathCount,
  getStepDisplayLabel,
  pathwayHasStateSteps,
  countStateStepsInPathway,
} from './pathway-queries'
