/**
 * Tree Parser Web Worker
 *
 * Parses tree structure text formats (indented, bulleted, numbered) off the
 * main thread to prevent UI freezing during large tree imports.
 *
 * Phase 3.4: Import Parser Web Worker
 *
 * Features:
 * - Supports all import formats (indented, bulleted, numbered)
 * - Duplicate label detection
 * - Error handling with detailed messages
 * - Non-blocking parsing for smooth typing experience
 *
 * Usage:
 * - Main thread sends: { type: 'parse', text: string, format: ImportFormat }
 * - Worker posts back: { type: 'result' | 'error', ... }
 */

import { parseByFormat, findDuplicateLabels } from '@/components/builders/tree-test/import/parsers'
import { countNodes } from '@/components/builders/tree-test/import/utils'
import type { ParsedNode, ImportFormat } from '@/components/builders/tree-test/import/types'

// ============================================================================
// Message Types
// ============================================================================

export interface ParserWorkerInput {
  type: 'parse'
  text: string
  format: ImportFormat
}

export interface ParserWorkerResult {
  type: 'result'
  parsed: ParsedNode[]
  duplicates: string[]
  nodeCount: number
}

export interface ParserWorkerError {
  type: 'error'
  error: string
}

export type ParserWorkerOutput = ParserWorkerResult | ParserWorkerError

// ============================================================================
// Worker Entry Point
// ============================================================================

self.onmessage = (event: MessageEvent<ParserWorkerInput>) => {
  const { type, text, format } = event.data

  if (type !== 'parse') {
    self.postMessage({
      type: 'error',
      error: `Unknown message type: ${type}`,
    } satisfies ParserWorkerError)
    return
  }

  try {
    // Validate input
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid input: text must be a non-empty string')
    }

    if (!format) {
      throw new Error('Invalid input: format is required')
    }

    // Parse based on format
    const parsed = parseByFormat(text, format)

    // Find duplicate labels
    const duplicates = findDuplicateLabels(parsed)

    // Count total nodes
    const nodeCount = countNodes(parsed)

    // Send result
    self.postMessage({
      type: 'result',
      parsed,
      duplicates,
      nodeCount,
    } satisfies ParserWorkerResult)
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    } satisfies ParserWorkerError)
  }
}

