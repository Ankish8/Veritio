import { useEffect, useRef, useState, useCallback } from 'react'
import type { ParsedNode, ImportFormat } from '@/components/builders/tree-test/import/types'
import { parseByFormat, findDuplicateLabels } from '@/components/builders/tree-test/import/parsers'
import { countNodes } from '@/components/builders/tree-test/import/utils'
import type {
  ParserWorkerInput,
  ParserWorkerOutput,
} from '@/workers/tree-parser.worker'

export interface ParseResult {
  parsed: ParsedNode[]
  duplicates: string[]
  nodeCount: number
}

export interface UseParserWorkerResult {
  /** Trigger parsing */
  parse: (text: string, format: ImportFormat) => void
  /** Whether parsing is in progress */
  isParsing: boolean
  /** Parsed result */
  result: ParseResult | null
  /** Error message if parsing failed */
  error: string | null
}

export function useParserWorker(): UseParserWorkerResult {
  const workerRef = useRef<Worker | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [result, setResult] = useState<ParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize worker on mount
  useEffect(() => {
    if (typeof Worker === 'undefined') return

    try {
      workerRef.current = new Worker(
        new URL('../workers/tree-parser.worker.ts', import.meta.url)
      )

      workerRef.current.onmessage = (event: MessageEvent<ParserWorkerOutput>) => {
        const message = event.data
        switch (message.type) {
          case 'result':
            setResult({
              parsed: message.parsed,
              duplicates: message.duplicates,
              nodeCount: message.nodeCount,
            })
            setIsParsing(false)
            break
          case 'error':
            setError(message.error)
            setIsParsing(false)
            break
        }
      }

      workerRef.current.onerror = (event) => {
        setError(event.message || 'Worker execution failed')
        setIsParsing(false)
      }
    } catch {
      // Worker creation failed, will use fallback in parse()
    }

    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  // Parse function
  const parse = useCallback((text: string, format: ImportFormat) => {
    // Reset state
    setIsParsing(true)
    setError(null)
    setResult(null)

    // If text is empty, return empty result
    if (!text.trim()) {
      setResult({ parsed: [], duplicates: [], nodeCount: 0 })
      setIsParsing(false)
      return
    }

    // If worker is available, use it
    if (workerRef.current) {
      const message: ParserWorkerInput = {
        type: 'parse',
        text,
        format,
      }
      workerRef.current.postMessage(message)
      return
    }

    // Fallback to main thread parsing
    try {
      const parsed = parseByFormat(text, format)
      const duplicates = findDuplicateLabels(parsed)
      const nodeCount = countNodes(parsed)

      setResult({ parsed, duplicates, nodeCount })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parsing failed')
    } finally {
      setIsParsing(false)
    }
  }, [])

  return {
    parse,
    isParsing,
    result,
    error,
  }
}

