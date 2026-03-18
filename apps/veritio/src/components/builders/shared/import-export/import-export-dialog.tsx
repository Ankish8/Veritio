'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Download, FileText, Copy, Check, AlertCircle, AlertTriangle } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import {
  KeyboardShortcutHint,
  EscapeHint,
} from '@/components/ui/keyboard-shortcut-hint'
import { useKeyboardShortcut } from '@veritio/ui'

import type { ImportExportDialogProps, ImportFormat, ExportFormat } from './types'
import { parseImportText } from './parsers'
import { generateByFormat, getFileExtension, getMimeType } from './generators'

// ============================================================================
// Placeholder Text
// ============================================================================

function getPlaceholder(format: ImportFormat, itemName: string): string {
  switch (format) {
    case 'text':
      return `Enter one ${itemName} per line:\nItem 1\nItem 2\nItem 3`
    case 'csv':
      return `label,description\nItem 1,Description for item 1\nItem 2,Description for item 2`
    case 'json':
      return `[\n  { "label": "Item 1", "description": "Description" },\n  { "label": "Item 2" }\n]`
    default:
      return ''
  }
}

// ============================================================================
// Component
// ============================================================================

export function ImportExportDialog({
  title,
  description,
  items,
  onImport,
  itemName = 'item',
  trigger,
}: ImportExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import')
  const [importText, setImportText] = useState('')
  const [importFormat, setImportFormat] = useState<ImportFormat>('text')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Parse preview - use useMemo to compute derived values
  const parseResult = useMemo(
    () => parseImportText(importText, importFormat),
    [importText, importFormat]
  )

  const parsed = parseResult.items
  const parseError = parseResult.error
  const duplicates = parseResult.duplicates

  // Generate export text
  const exportText = useCallback(
    () => generateByFormat(items, exportFormat),
    [items, exportFormat]
  )

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setImportText(text)

      // Auto-detect format
      if (file.name.endsWith('.json')) {
        setImportFormat('json')
      } else if (file.name.endsWith('.csv')) {
        setImportFormat('csv')
      } else {
        setImportFormat('text')
      }
    }
    reader.readAsText(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle import
  const handleImport = () => {
    if (parsed.length === 0) {
      toast.error('No items to import', {
        description: 'Please enter valid data to import.',
      })
      return
    }

    onImport(parsed)
    setImportText('')
    setOpen(false)
    toast.success(`Imported ${parsed.length} ${itemName}${parsed.length !== 1 ? 's' : ''}`)
  }

  // Handle copy
  const handleCopy = async () => {
    const text = exportText()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard')
  }

  // Handle download
  const handleDownload = () => {
    const text = exportText()
    const extension = getFileExtension(exportFormat)
    const mimeType = getMimeType(exportFormat)

    const blob = new Blob([text], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${itemName}s.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success(`Downloaded ${itemName}s.${extension}`)
  }

  // Keyboard shortcuts
  useKeyboardShortcut({
    enabled: open && activeTab === 'import' && parsed.length > 0,
    onCmdEnter: handleImport,
  })

  useKeyboardShortcut({
    enabled: open && activeTab === 'export' && items.length > 0,
    onCmdEnter: handleDownload,
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Import/Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'import' | 'export')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">
              Import
            </TabsTrigger>
            <TabsTrigger value="export">
              Export
            </TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="flex gap-2">
                <Button
                  variant={importFormat === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportFormat('text')}
                >
                  Plain Text
                </Button>
                <Button
                  variant={importFormat === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportFormat('csv')}
                >
                  CSV
                </Button>
                <Button
                  variant={importFormat === 'json' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportFormat('json')}
                >
                  JSON
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Data</Label>
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
                placeholder={getPlaceholder(importFormat, itemName)}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              {parseError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {parseError}
                </div>
              )}
              {duplicates.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-yellow-600">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Duplicate labels found:</strong>{' '}
                    {duplicates.slice(0, 3).map(d => `"${d}"`).join(', ')}
                    {duplicates.length > 3 && ` and ${duplicates.length - 3} more`}
                    . Duplicates may cause confusion.
                  </span>
                </div>
              )}
            </div>

            {parsed.length > 0 && (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm font-medium">
                  Preview: {parsed.length} {itemName}
                  {parsed.length !== 1 ? 's' : ''} found
                </p>
                <ul className="mt-2 max-h-32 overflow-y-auto text-sm text-muted-foreground">
                  {parsed.slice(0, 5).map((item, i) => (
                    <li key={i} className="truncate">
                      • {item.label}
                      {item.description && (
                        <span className="opacity-60"> - {item.description}</span>
                      )}
                    </li>
                  ))}
                  {parsed.length > 5 && (
                    <li className="text-muted-foreground">...and {parsed.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} className="inline-flex items-center">
                Cancel
                <EscapeHint />
              </Button>
              <Button onClick={handleImport} disabled={parsed.length === 0} className="inline-flex items-center">
                <Upload className="mr-2 h-4 w-4" />
                Import {parsed.length > 0 ? `${parsed.length} ${itemName}${parsed.length !== 1 ? 's' : ''}` : ''}
                {parsed.length > 0 && <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="flex gap-2">
                <Button
                  variant={exportFormat === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('csv')}
                >
                  CSV
                </Button>
                <Button
                  variant={exportFormat === 'json' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('json')}
                >
                  JSON
                </Button>
                <Button
                  variant={exportFormat === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('text')}
                >
                  Plain Text
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                {items.length} {itemName}
                {items.length !== 1 ? 's' : ''} to export
              </Label>
              <Textarea
                value={exportText()}
                readOnly
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCopy} className="inline-flex items-center">
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button onClick={handleDownload} className="inline-flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Download
                <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
