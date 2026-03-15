'use client'

import { useState, useCallback } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  KeyboardShortcutHint,
  EscapeHint,
  useKeyboardShortcut,
} from '@veritio/ui'
import { parseFigmaUrl } from '../services/prototype-service'

interface FigmaImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (figmaUrl: string) => Promise<void>
  isImporting?: boolean
}

export function FigmaImportDialog({
  open,
  onOpenChange,
  onImport,
  isImporting = false,
}: FigmaImportDialogProps) {
  const [figmaUrl, setFigmaUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleImport = useCallback(async () => {
    setError(null)

    // Validate URL format
    const parsed = parseFigmaUrl(figmaUrl)
    if (!parsed) {
      setError('Please enter a valid Figma prototype URL')
      return
    }

    try {
      await onImport(figmaUrl)
      setFigmaUrl('')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import prototype')
    }
  }, [figmaUrl, onImport, onOpenChange])

  const handleClose = () => {
    if (!isImporting) {
      setFigmaUrl('')
      setError(null)
      onOpenChange(false)
    }
  }

  // Keyboard shortcuts: Cmd+Enter to import (when valid and not importing)
  useKeyboardShortcut({
    enabled: open && !!figmaUrl.trim() && !isImporting,
    onCmdEnter: handleImport,
  })

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Figma Prototype</DialogTitle>
          <DialogDescription>
            Paste the URL of a public Figma prototype to import it for testing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="figma-url">Figma Prototype URL</Label>
            <Input
              id="figma-url"
              placeholder="https://www.figma.com/proto/..."
              value={figmaUrl}
              onChange={(e) => {
                setFigmaUrl(e.target.value)
                setError(null)
              }}
              disabled={isImporting}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
            <p className="font-medium">How to get the prototype URL:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Open your Figma file</li>
              <li>Click the Play button (▶) to enter presentation mode</li>
              <li>Click "Share Prototype" and copy the link</li>
            </ol>
            <a
              href="https://help.figma.com/hc/en-us/articles/360040531773-Share-prototypes"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
            >
              Learn more about sharing Figma prototypes
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancel
            <EscapeHint />
          </Button>
          <Button onClick={handleImport} disabled={!figmaUrl.trim() || isImporting}>
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isImporting ? 'Importing...' : 'Import Prototype'}
            {!isImporting && <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
