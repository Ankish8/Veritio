'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Upload, Download, FileText, AlertCircle, Check, AlertTriangle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import { useParserWorker } from '@/hooks/use-parser-worker'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTreeTestNodes, useTreeTestActions } from '@/stores/study-builder'
import { toast } from '@/components/ui/sonner'

import type { ParsedNode, ImportFormat, TreeImportModalProps } from './types'
import { countNodes, flattenToTreeNodes, getPlaceholder } from './utils'
import { parseByFormat, findDuplicateLabels } from './parsers'

export function TreeImportModal({
  open,
  onOpenChange,
  studyId,
}: TreeImportModalProps) {
  // Use granular selectors for performance
  const nodes = useTreeTestNodes()
  const { setNodes, expandAll } = useTreeTestActions()
  const [importText, setImportText] = useState('')
  const [previewNodes, setPreviewNodes] = useState<ParsedNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importFormat, setImportFormat] = useState<ImportFormat>('text')
  const [duplicates, setDuplicates] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Phase 3.4: Use Web Worker for non-blocking parsing
  const {
    parse: workerParse,
    isParsing: isWorkerParsing,
    result: workerResult,
    error: workerError,
  } = useParserWorker()

  // Update preview when worker completes parsing
  useEffect(() => {
    if (workerResult) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewNodes(workerResult.parsed)
      setDuplicates(workerResult.duplicates)
      setError(null)
    } else if (workerError) {
      setError(workerError)
      setPreviewNodes([])
      setDuplicates([])
    }
  }, [workerResult, workerError])

  // ============================================================================
  // Handlers
  // ============================================================================

  // Debounced parsing to avoid blocking on every keystroke
  // Phase 3.4: Uses Web Worker for non-blocking parsing
  const debouncedParse = useDebouncedCallback((text: string, format: ImportFormat) => {
    if (text.trim()) {
      // Trigger worker parsing (non-blocking)
      workerParse(text, format)
    } else {
      setPreviewNodes([])
      setError(null)
      setDuplicates([])
    }
  }, 300)

  const handleTextChange = useCallback((text: string) => {
    setImportText(text)
    setError(null)
    debouncedParse(text, importFormat)
  }, [importFormat, debouncedParse])

  const handleFormatChange = useCallback((format: ImportFormat) => {
    setImportFormat(format)
    setError(null)
    debouncedParse(importText, format)
  }, [importText, debouncedParse])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setImportText(text)

      // Auto-detect format from extension
      let detectedFormat: ImportFormat = 'text'
      if (file.name.endsWith('.json')) {
        detectedFormat = 'json'
      } else if (file.name.endsWith('.csv')) {
        detectedFormat = 'csv'
      }

      setImportFormat(detectedFormat)
      setError(null)
      setDuplicates([])

      try {
        const parsed = parseByFormat(text, detectedFormat)
        setPreviewNodes(parsed)

        const dupes = findDuplicateLabels(parsed)
        setDuplicates(dupes)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to parse tree structure'
        setError(message)
        setPreviewNodes([])
      }
    }
    reader.readAsText(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleImport = useCallback(() => {
    if (previewNodes.length === 0) {
      setError('No valid tree structure found')
      return
    }

    const newNodes = flattenToTreeNodes(previewNodes, studyId)
    const nodeCount = countNodes(previewNodes)

    // Append to existing nodes or replace
    if (nodes.length > 0) {
      // Adjust positions for new root nodes
      const maxPosition = Math.max(...nodes.filter(n => !n.parent_id).map(n => n.position), -1)
      const adjustedNodes = newNodes.map((n, i) =>
        n.parent_id === null
          ? { ...n, position: maxPosition + 1 + i }
          : n
      )
      setNodes([...nodes, ...adjustedNodes])
    } else {
      setNodes(newNodes)
    }

    expandAll()
    onOpenChange(false)
    setImportText('')
    setPreviewNodes([])
    setDuplicates([])
    setError(null)

    toast.success(`Imported ${nodeCount} node${nodeCount !== 1 ? 's' : ''}`)
  }, [previewNodes, studyId, nodes, setNodes, expandAll, onOpenChange])

  // Keyboard shortcuts: Cmd+Enter to import (when valid)
  useKeyboardShortcut({
    enabled: open && countNodes(previewNodes) > 0,
    onCmdEnter: handleImport,
  })

  const handleExport = useCallback(() => {
    const rootNodes = nodes.filter((n) => !n.parent_id).sort((a, b) => a.position - b.position)

    function buildText(nodeId: string | null, level: number): string {
      const children = nodes
        .filter((n) => n.parent_id === nodeId)
        .sort((a, b) => a.position - b.position)

      return children
        .map((child) => {
          const indent = '\t'.repeat(level)
          const childText = buildText(child.id, level + 1)
          return `${indent}${child.label}${childText ? '\n' + childText : ''}`
        })
        .join('\n')
    }

    const text = rootNodes
      .map((root) => {
        const childText = buildText(root.id, 1)
        return `${root.label}${childText ? '\n' + childText : ''}`
      })
      .join('\n')

    // Download as text file
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tree-structure.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [nodes])

  // ============================================================================
  // Render
  // ============================================================================

  const previewCount = countNodes(previewNodes)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Tree
          </DialogTitle>
          <DialogDescription>
            Import a tree structure from text, JSON, or CSV format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Format</Label>
            <div className="flex gap-2">
              <Button
                variant={importFormat === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFormatChange('text')}
              >
                Indented Text
              </Button>
              <Button
                variant={importFormat === 'json' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFormatChange('json')}
              >
                JSON
              </Button>
              <Button
                variant={importFormat === 'csv' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFormatChange('csv')}
              >
                CSV
              </Button>
            </div>
          </div>

          {/* Input Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="tree-import">Tree Structure</Label>
                {isWorkerParsing && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Parsing...
                  </span>
                )}
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.csv,.json"
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
              </div>
            </div>
            <Textarea
              id="tree-import"
              placeholder={getPlaceholder(importFormat)}
              value={importText}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Duplicate Warning */}
          {duplicates.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-600">
                <strong>Duplicate labels found:</strong>{' '}
                {duplicates.slice(0, 3).map(d => `"${d}"`).join(', ')}
                {duplicates.length > 3 && ` and ${duplicates.length - 3} more`}
                . This may cause confusion in your tree test.
              </AlertDescription>
            </Alert>
          )}

          {/* Success Preview */}
          {previewCount > 0 && !error && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                Ready to import <strong>{previewCount}</strong> node{previewCount !== 1 ? 's' : ''}
                {nodes.length > 0 && (
                  <span className="text-muted-foreground">
                    {' '}(will be added to existing {nodes.length} nodes)
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={nodes.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Current Tree
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
                <EscapeHint />
              </Button>
              <Button onClick={handleImport} disabled={previewCount === 0}>
                <FileText className="mr-2 h-4 w-4" />
                Import {previewCount > 0 && `(${previewCount} nodes)`}
                <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
