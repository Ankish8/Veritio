import { truncateText } from '../utils'

/**
 * Get a display label for a task at a given position.
 * Uses the provided text if available, otherwise falls back to "Task N".
 */
export function getTaskLabel(text: string | undefined | null, position: number): string {
  if (text) {
    return truncateText(text, 30)
  }
  return `Task ${position}`
}
