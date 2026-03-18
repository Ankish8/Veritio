'use client'

import { useState, useMemo, useCallback } from 'react'
import { toast } from '@/components/ui/sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import { useKeyboardShortcut } from '@veritio/ui'
import { Loader2, FileText, CheckCircle2 } from 'lucide-react'
import {
  getSectionsWithAvailability,
  getDefaultSections,
  type SectionDefinition,
} from '@/lib/export'
import { cn } from '@/lib/utils'
import { createAuthFetch } from '@veritio/auth/fetch'

interface PDFExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
  studyTitle: string
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test'
  /** Study data for checking section availability */
  studyData: Record<string, unknown>
}

type GenerationState = 'idle' | 'generating' | 'complete' | 'error'

export function PDFExportDialog({
  open,
  onOpenChange,
  studyId,
  studyTitle,
  studyType,
  studyData,
}: PDFExportDialogProps) {
  // Get sections with availability status
  const sectionsWithAvailability = useMemo(
    () => getSectionsWithAvailability(studyType, studyData),
    [studyType, studyData]
  )

  // Track selected sections
  const [selectedSections, setSelectedSections] = useState<Set<string>>(() => {
    const defaults = getDefaultSections(studyType)
    // Only include defaults that have data
    return new Set(
      defaults.filter((id) =>
        sectionsWithAvailability.find((s) => s.id === id)?.hasData
      )
    )
  })

  // Generation state
  const [generationState, setGenerationState] = useState<GenerationState>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 1, stage: '' })
  const [generatedFilename, setGeneratedFilename] = useState<string>('')

  // Group sections by category
  const groupedSections = useMemo(() => {
    const groups: Record<string, Array<SectionDefinition & { hasData: boolean }>> = {}

    sectionsWithAvailability.forEach((section) => {
      const category = section.category
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(section)
    })

    return groups
  }, [sectionsWithAvailability])

  // Category labels
  const categoryLabels: Record<string, string> = {
    overview: 'Overview',
    analysis: 'Analysis',
    questionnaire: 'Questionnaire',
    participants: 'Participants',
  }

  // Toggle section selection
  const toggleSection = useCallback((sectionId: string) => {
    setSelectedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  // Select/deselect all available sections
  const selectAll = useCallback(() => {
    const available = sectionsWithAvailability
      .filter((s) => s.hasData)
      .map((s) => s.id)
    setSelectedSections(new Set(available))
  }, [sectionsWithAvailability])

  const deselectAll = useCallback(() => {
    setSelectedSections(new Set())
  }, [])

  // Handle PDF generation via server-side API
  const handleGenerate = useCallback(async () => {
    if (selectedSections.size === 0) {
      toast.error('Please select at least one section')
      return
    }

    setGenerationState('generating')
    setProgress({ current: 0, total: 1, stage: 'Generating PDF report...' })

    try {
      // Use auth fetch utility for consistency with other API calls
      const authFetch = createAuthFetch()

      const response = await authFetch(`/api/studies/${studyId}/export/pdf`, {
        method: 'POST',
        body: JSON.stringify({
          sections: Array.from(selectedSections),
          options: {
            includeCoverPage: true,
            includeTableOfContents: true,
          },
        }),
      })

      // Handle non-JSON responses (like "Internal Server Error")
      const responseText = await response.text()
      let result
      try {
        result = JSON.parse(responseText)
      } catch {
        console.error('[PDF Export] Non-JSON response:', response.status, responseText.substring(0, 200))
        throw new Error(`Server error (${response.status}): ${responseText.substring(0, 100)}`)
      }

      if (!response.ok || !result.success) {
        const errorMsg = result.error || result.message || `HTTP ${response.status}: Failed to generate PDF`
        throw new Error(errorMsg)
      }

      // Convert base64 to blob and download
      const pdfBytes = Uint8Array.from(atob(result.pdf), (c) => c.charCodeAt(0))
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename || `${studyTitle}_report.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setGenerationState('complete')
      setGeneratedFilename(result.filename || 'report.pdf')
      toast.success('PDF report generated successfully')
    } catch (error) {
      setGenerationState('error')
      toast.error(error instanceof Error ? error.message : 'Failed to generate PDF')
    }
  }, [selectedSections, studyId, studyTitle])

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (generationState === 'generating') {
      return // Don't close while generating
    }
    setGenerationState('idle')
    setProgress({ current: 0, total: 1, stage: '' })
    onOpenChange(false)
  }, [generationState, onOpenChange])

  // Keyboard shortcuts: Cmd+Enter to generate (when idle and has selection)
  useKeyboardShortcut({
    enabled: open && generationState === 'idle' && selectedSections.size > 0,
    onCmdEnter: handleGenerate,
  })

  // Calculate progress percentage
  const progressPercent =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  // Count available and selected
  const availableCount = sectionsWithAvailability.filter((s) => s.hasData).length
  const selectedCount = selectedSections.size

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export PDF Report
          </DialogTitle>
          <DialogDescription>
            Select which sections to include in your PDF report.
          </DialogDescription>
        </DialogHeader>

        {generationState === 'idle' && (
          <>
            {/* Selection controls */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {selectedCount} of {availableCount} sections selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  disabled={selectedCount === availableCount}
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  disabled={selectedCount === 0}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Section selection */}
            <div className="max-h-[400px] space-y-6 overflow-y-auto pr-2">
              {Object.entries(groupedSections).map(([category, sections]) => (
                <div key={category}>
                  <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                    {categoryLabels[category] || category}
                  </h4>
                  <div className="space-y-2">
                    {sections.map((section) => (
                      <label
                        key={section.id}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                          section.hasData
                            ? 'hover:bg-muted/50'
                            : 'cursor-not-allowed opacity-50',
                          selectedSections.has(section.id) &&
                            section.hasData &&
                            'border-primary/50 bg-primary/5'
                        )}
                      >
                        <Checkbox
                          checked={selectedSections.has(section.id)}
                          disabled={!section.hasData}
                          onCheckedChange={() => toggleSection(section.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {section.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {section.description}
                          </div>
                          {!section.hasData && (
                            <div className="mt-1 text-xs text-amber-600">
                              No data available
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
                <EscapeHint />
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={selectedSections.size === 0}
              >
                Generate PDF
                <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
              </Button>
            </DialogFooter>
          </>
        )}

        {generationState === 'generating' && (
          <div className="space-y-6 py-8">
            <div className="flex justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>

            <div className="text-center">
              <p className="font-medium">Generating PDF Report</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {progress.stage}
              </p>
            </div>

            <Progress value={progressPercent} className="w-full" />

            <p className="text-center text-xs text-muted-foreground">
              {progress.current} of {progress.total} steps complete
            </p>
          </div>
        )}

        {generationState === 'complete' && (
          <div className="space-y-6 py-8">
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>

            <div className="text-center">
              <p className="font-medium">PDF Generated Successfully</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your report has been downloaded as{' '}
                <span className="font-mono text-xs">{generatedFilename}</span>
              </p>
            </div>

            <DialogFooter className="justify-center">
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}

        {generationState === 'error' && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <p className="font-medium text-destructive">Generation Failed</p>
              <p className="mt-1 text-sm text-muted-foreground">
                There was an error generating the PDF. Please try again.
              </p>
            </div>

            <DialogFooter className="justify-center">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleGenerate}>Retry</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
