/**
 * Types and sorting utilities for first click analysis.
 */

/**
 * Extended first click data with additional metrics for the analysis table
 */
export interface ExtendedFirstClickData {
  nodeId: string
  nodeLabel: string
  breadcrumbPath: string[]           // ["Home", "Products", "Electronics"]
  breadcrumbPathString: string       // "Home > Products > Electronics"
  count: number                      // Participants who clicked this FIRST
  percentage: number                 // % clicked first
  clickedDuringTaskCount: number     // Participants who clicked at ANY point
  clickedDuringTaskPercentage: number
  isOnCorrectPath: boolean
  avgTimeToFirstClickMs: number | null  // Average time to first click for this path
}

/**
 * Summary statistics for first click analysis
 */
export interface FirstClickSummary {
  totalResponses: number
  correctFirstClickCount: number
  correctFirstClickRate: number      // Percentage (0-100)
  correctFirstClickPath: string      // Breadcrumb of correct first click (e.g., "Home > Products")
  avgTimeToFirstClickMs: number | null
}

export type ColumnKey = 'path' | 'correctFirstClick' | 'clickedFirst' | 'clickedDuringTask' | 'avgTime'
export type SortField = Exclude<ColumnKey, 'avgTime'>
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  field: SortField
  direction: SortDirection
}

/**
 * Sort extended first click data by the specified field and direction.
 *
 * @param data - Data to sort
 * @param sortConfig - Sort configuration
 * @returns New sorted array (does not mutate original)
 */
export function sortFirstClickData(
  data: ExtendedFirstClickData[],
  sortConfig: SortConfig
): ExtendedFirstClickData[] {
  const { field, direction } = sortConfig
  const multiplier = direction === 'asc' ? 1 : -1

  return [...data].sort((a, b) => {
    switch (field) {
      case 'path':
        return multiplier * a.breadcrumbPathString.localeCompare(b.breadcrumbPathString)

      case 'correctFirstClick':
        // Sort by isOnCorrectPath (true first in desc, false first in asc)
        return multiplier * (Number(b.isOnCorrectPath) - Number(a.isOnCorrectPath))

      case 'clickedFirst':
        return multiplier * (a.percentage - b.percentage)

      case 'clickedDuringTask':
        return multiplier * (a.clickedDuringTaskPercentage - b.clickedDuringTaskPercentage)

      default:
        return 0
    }
  })
}
