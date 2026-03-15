/**
 * Import CSV Dialog
 *
 * Dialog for importing participants from CSV file.
 */

'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

interface ParsedParticipant {
  email: string
  first_name?: string
  last_name?: string
}

interface ImportCSVDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (data: {
    participants: ParsedParticipant[]
    duplicate_handling: 'skip' | 'update' | 'merge'
    auto_create_tags: boolean
  }) => Promise<{ created: number; updated: number; failed: number }>
}

export function ImportCSVDialog({ open, onOpenChange, onImport }: ImportCSVDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedParticipant[]>([])
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update' | 'merge'>('skip')
  const [isImporting, setIsImporting] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const parseCSV = useCallback((text: string): ParsedParticipant[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row')
    }

    const header = lines[0].toLowerCase().split(',').map((h) => h.trim())
    const emailIndex = header.findIndex((h) => h === 'email')
    const firstNameIndex = header.findIndex((h) => h === 'first_name' || h === 'firstname' || h === 'first name')
    const lastNameIndex = header.findIndex((h) => h === 'last_name' || h === 'lastname' || h === 'last name')

    if (emailIndex === -1) {
      throw new Error('CSV must have an "email" column')
    }

    const participants: ParsedParticipant[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''))
      const email = values[emailIndex]

      if (email && email.includes('@')) {
        participants.push({
          email,
          first_name: firstNameIndex !== -1 ? values[firstNameIndex] : undefined,
          last_name: lastNameIndex !== -1 ? values[lastNameIndex] : undefined,
        })
      }
    }

    return participants
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (!selectedFile) return

      setFile(selectedFile)
      setParseError(null)

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string
          const parsed = parseCSV(text)
          setParsedData(parsed)
        } catch (error) {
          setParseError(error instanceof Error ? error.message : 'Failed to parse CSV')
          setParsedData([])
        }
      }
      reader.readAsText(selectedFile)
    },
    [parseCSV]
  )

  const handleImport = async () => {
    if (parsedData.length === 0) return

    setIsImporting(true)
    try {
      const result = await onImport({
        participants: parsedData,
        duplicate_handling: duplicateHandling,
        auto_create_tags: false,
      })

      toast.success(
        `Import complete: ${result.created} created, ${result.updated} updated, ${result.failed} failed`
      )
      onOpenChange(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import participants')
    } finally {
      setIsImporting(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setParsedData([])
    setParseError(null)
    setDuplicateHandling('skip')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm()
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Participants</DialogTitle>
          <DialogDescription>
            Upload a CSV file with participant data. The file must have an "email" column.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>CSV File</Label>
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                'hover:border-primary/50 hover:bg-muted/30',
                file ? 'border-primary bg-primary/5' : 'border-border'
              )}
              onClick={() => document.getElementById('csv-upload')?.click()}
            >
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-muted-foreground">CSV files only</span>
                </div>
              )}
            </div>
          </div>

          {/* Parse Error */}
          {parseError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {parseError}
            </div>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
              {parsedData.length} valid participants found
            </div>
          )}

          {/* Duplicate Handling */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <Label>Duplicate Handling</Label>
              <Select
                value={duplicateHandling}
                onValueChange={(v) => setDuplicateHandling(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip duplicates</SelectItem>
                  <SelectItem value="update">Update existing</SelectItem>
                  <SelectItem value="merge">Merge data</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {duplicateHandling === 'skip' && 'Existing participants will be skipped'}
                {duplicateHandling === 'update' && 'Existing participants will be replaced'}
                {duplicateHandling === 'merge' && 'New data will be merged with existing'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={parsedData.length === 0 || isImporting}>
            {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Import {parsedData.length > 0 && `(${parsedData.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
