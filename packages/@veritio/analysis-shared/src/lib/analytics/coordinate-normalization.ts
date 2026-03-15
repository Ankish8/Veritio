export interface LetterboxOffset {
  offsetX: number
  offsetY: number
  scale: number
}

export function calculateLetterboxOffset(
  containerWidth: number,
  containerHeight: number,
  imageNaturalWidth: number,
  imageNaturalHeight: number
): LetterboxOffset {
  if (containerWidth === 0 || containerHeight === 0 || imageNaturalWidth === 0 || imageNaturalHeight === 0) {
    return { offsetX: 0, offsetY: 0, scale: 1 }
  }

  const containerAspect = containerWidth / containerHeight
  const imageAspect = imageNaturalWidth / imageNaturalHeight

  let scale: number
  let renderedWidth: number
  let renderedHeight: number

  if (imageAspect > containerAspect) {
    scale = containerWidth / imageNaturalWidth
    renderedWidth = containerWidth
    renderedHeight = imageNaturalHeight * scale
  } else {
    scale = containerHeight / imageNaturalHeight
    renderedWidth = imageNaturalWidth * scale
    renderedHeight = containerHeight
  }

  const offsetX = (containerWidth - renderedWidth) / 2
  const offsetY = (containerHeight - renderedHeight) / 2

  return { offsetX, offsetY, scale }
}

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

export function aggregateClicksToHeatmapPoints(
  clicks: { normalizedX: number; normalizedY: number; wasHotspot?: boolean }[],
  gridSize: number = 2
): { x: number; y: number; value: number; wasHotspot?: boolean }[] {
  const grid = new Map<string, { x: number; y: number; value: number; hits: number; misses: number }>()

  for (const click of clicks) {
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
    wasHotspot: point.hits >= point.misses,
  }))
}

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

export function normalizeDecimalToPercent(
  x: number,
  y: number
): { normalizedX: number; normalizedY: number } {
  return {
    normalizedX: Math.round(x * 10000) / 100, // 2 decimal places
    normalizedY: Math.round(y * 10000) / 100,
  }
}

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
