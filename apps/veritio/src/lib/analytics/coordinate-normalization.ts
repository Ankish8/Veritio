/**
 * Coordinate normalization utilities for heatmap rendering.
 *
 * Click coordinates are stored as absolute pixels in the database.
 * For rendering on different screen sizes, we normalize to percentages (0-100).
 *
 * Flow: DB pixels → normalize to % → scale to display dimensions
 */

/**
 * Normalize pixel coordinates to percentage (0-100) of frame dimensions.
 * Used when processing raw click data from the database.
 *
 * @param x - X coordinate in pixels
 * @param y - Y coordinate in pixels
 * @param frameWidth - Original frame width in pixels
 * @param frameHeight - Original frame height in pixels
 * @returns Normalized coordinates as percentages (0-100)
 */
export function normalizeToPercent(
  x: number,
  y: number,
  frameWidth: number,
  frameHeight: number
): { normalizedX: number; normalizedY: number } {
  if (frameWidth <= 0 || frameHeight <= 0) {
    return { normalizedX: 0, normalizedY: 0 }
  }

  return {
    normalizedX: Math.round((x / frameWidth) * 10000) / 100, // 2 decimal places
    normalizedY: Math.round((y / frameHeight) * 10000) / 100,
  }
}

/**
 * Scale percentage coordinates to display pixel dimensions.
 * Used when rendering clicks on a canvas of specific size.
 *
 * @param normalizedX - X as percentage (0-100)
 * @param normalizedY - Y as percentage (0-100)
 * @param displayWidth - Display container width in pixels
 * @param displayHeight - Display container height in pixels
 * @returns Pixel coordinates for the display container
 */
export function scaleToDisplay(
  normalizedX: number,
  normalizedY: number,
  displayWidth: number,
  displayHeight: number
): { x: number; y: number } {
  return {
    x: Math.round((normalizedX / 100) * displayWidth),
    y: Math.round((normalizedY / 100) * displayHeight),
  }
}

/**
 * Batch normalize an array of click coordinates.
 * Useful for processing database results.
 */
export function normalizeClickCoordinates<T extends { x: number; y: number }>(
  clicks: T[],
  frameWidth: number,
  frameHeight: number
): (T & { normalizedX: number; normalizedY: number })[] {
  return clicks.map(click => {
    const { normalizedX, normalizedY } = normalizeToPercent(
      click.x,
      click.y,
      frameWidth,
      frameHeight
    )
    return { ...click, normalizedX, normalizedY }
  })
}

/**
 * Aggregate nearby clicks into weighted points for heatmap rendering.
 * Groups clicks within a threshold distance and sums their counts.
 *
 * @param clicks - Array of normalized click data
 * @param gridSize - Size of aggregation grid (percentage, e.g., 2 = 2% grid cells)
 * @returns Aggregated heatmap points with click counts
 */
export function aggregateClicksToHeatmapPoints(
  clicks: { normalizedX: number; normalizedY: number; wasHotspot?: boolean }[],
  gridSize: number = 2
): { x: number; y: number; value: number; wasHotspot?: boolean }[] {
  const grid = new Map<string, { x: number; y: number; value: number; hits: number; misses: number }>()

  for (const click of clicks) {
    // Snap to grid
    const gridX = Math.floor(click.normalizedX / gridSize) * gridSize + gridSize / 2
    const gridY = Math.floor(click.normalizedY / gridSize) * gridSize + gridSize / 2
    const key = `${gridX},${gridY}`

    const existing = grid.get(key)
    if (existing) {
      existing.value++
      if (click.wasHotspot) existing.hits++
      else existing.misses++
    } else {
      grid.set(key, {
        x: gridX,
        y: gridY,
        value: 1,
        hits: click.wasHotspot ? 1 : 0,
        misses: click.wasHotspot ? 0 : 1,
      })
    }
  }

  return Array.from(grid.values()).map(point => ({
    x: point.x,
    y: point.y,
    value: point.value,
    // Point is considered a "hit" if majority of clicks were on hotspots
    wasHotspot: point.hits >= point.misses,
  }))
}

/**
 * Calculate the bounding box of click points with padding.
 * Useful for auto-zooming to click area.
 */
export function calculateClickBounds(
  clicks: { normalizedX: number; normalizedY: number }[],
  padding: number = 10
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (clicks.length === 0) return null

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const click of clicks) {
    minX = Math.min(minX, click.normalizedX)
    minY = Math.min(minY, click.normalizedY)
    maxX = Math.max(maxX, click.normalizedX)
    maxY = Math.max(maxY, click.normalizedY)
  }

  return {
    minX: Math.max(0, minX - padding),
    minY: Math.max(0, minY - padding),
    maxX: Math.min(100, maxX + padding),
    maxY: Math.min(100, maxY + padding),
  }
}

// ============================================================================
// First-Click Coordinate Normalization
// ============================================================================

/**
 * Convert 0-1 decimal coordinates to 0-100 percentage scale.
 * Used for first-click data compatibility with prototype test components.
 *
 * @param x - X coordinate as decimal (0-1)
 * @param y - Y coordinate as decimal (0-1)
 * @returns Coordinates as percentages (0-100)
 */
export function normalizeDecimalToPercent(
  x: number,
  y: number
): { normalizedX: number; normalizedY: number } {
  return {
    normalizedX: Math.round(x * 10000) / 100, // 2 decimal places
    normalizedY: Math.round(y * 10000) / 100,
  }
}

/**
 * Batch normalize first-click responses (0-1 coordinates) to percentage scale (0-100).
 * Filters out null/undefined coordinates and skipped responses.
 *
 * @param responses - Array of first-click responses with click_x, click_y in 0-1 range
 * @returns Normalized responses with normalizedX, normalizedY in 0-100 range
 */
export function normalizeFirstClickCoordinates<T extends {
  click_x: number | null
  click_y: number | null
  is_skipped?: boolean | null
}>(
  responses: T[]
): (T & { normalizedX: number; normalizedY: number })[] {
  return responses
    .filter((r): r is T & { click_x: number; click_y: number } =>
      r.click_x !== null &&
      r.click_y !== null &&
      !r.is_skipped
    )
    .map(r => {
      const { normalizedX, normalizedY } = normalizeDecimalToPercent(r.click_x, r.click_y)
      return { ...r, normalizedX, normalizedY }
    })
}
