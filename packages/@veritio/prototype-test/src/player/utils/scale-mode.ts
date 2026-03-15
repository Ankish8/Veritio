/**
 * Utility for handling prototype scale mode values.
 */
import type { PrototypeScaleMode } from '@veritio/study-types'

/**
 * Convert legacy boolean scalePrototype value to new string mode.
 *
 * Handles: null, undefined, boolean (legacy), and string (new format)
 * - null/undefined → 'fit' (default)
 * - true (legacy) → 'fit' (scale down to fit)
 * - false (legacy) → '100%' (original size)
 * - string value → pass through (validated)
 */
export function getScaleMode(value: PrototypeScaleMode | boolean | null | undefined): PrototypeScaleMode {
  // Handle null/undefined explicitly (JSONB can return null)
  if (value === null || value === undefined) {
    return 'fit'
  }
  // Handle legacy boolean values
  if (typeof value === 'boolean') {
    return value ? 'fit' : '100%'
  }
  // Validate string values - fallback to 'fit' if invalid
  const validModes: PrototypeScaleMode[] = ['100%', 'fit', 'fill', 'width']
  return validModes.includes(value) ? value : 'fit'
}
