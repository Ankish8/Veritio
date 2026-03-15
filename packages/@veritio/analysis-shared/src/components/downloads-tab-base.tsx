'use client'

import { useState } from 'react'
import { Button } from '@veritio/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { FileDown, Loader2 } from 'lucide-react'
import { toast } from '@veritio/ui/components/sonner'

// Export format type (duplicated from main app to avoid circular dependency)
export type ExportFormat = 'csv' | 'pdf'
export interface ExportOption {
  id: string
  title: string
  description: string
  formats?: ExportFormat[]
  onDownload?: (format: ExportFormat) => void | Promise<void>
  disabled?: boolean
  comingSoon?: boolean
}

export interface DownloadsTabBaseProps {
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression'
  exportOptions: ExportOption[]
  title?: string
  description?: string
}
export function DownloadsTabBase({
  studyType,
  exportOptions,
  title = 'Export Data',
  description,
}: DownloadsTabBaseProps) {
  const defaultDescription = studyType === 'tree_test'
    ? 'Download your tree test data in various formats for further analysis.'
    : studyType === 'survey'
    ? 'Download your survey data in various formats for further analysis.'
    : studyType === 'prototype_test'
    ? 'Download your prototype test data in various formats for further analysis.'
    : 'Download your study data in various formats for further analysis.'

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-medium mb-1.5 sm:mb-2">{title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
          {description || defaultDescription}
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {exportOptions.map((option) => (
          <ExportCard key={option.id} {...option} />
        ))}
      </div>
    </div>
  )
}
function ExportCard({
  title,
  description,
  formats = ['csv'],
  onDownload,
  disabled = false,
  comingSoon = false,
}: ExportOption) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(formats[0])
  const [isLoading, setIsLoading] = useState(false)

  // Check if this is a PDF-only option
  const isPdfOnly = formats.length === 1 && formats[0] === 'pdf'

  const handleDownload = async () => {
    if (!onDownload || isLoading) return

    setIsLoading(true)
    try {
      await onDownload(selectedFormat)
      // Don't show success toast for PDF (the dialog handles it)
      if (!isPdfOnly) {
        toast.success('Export downloaded successfully')
      }
    } catch {
      toast.error('Export failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show format selector for CSV/XLSX options (not for PDF)
  const dataFormats = formats.filter(f => f !== 'pdf')
  const showFormatSelector = dataFormats.length > 1 && !comingSoon

  return (
    <div className="rounded-lg border p-3 sm:p-4">
      <div className="flex items-start gap-2 sm:gap-3">
        <FileDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm sm:text-base truncate">{title}</h4>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>

          <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-3">
            {showFormatSelector && (
              <Select
                value={selectedFormat}
                onValueChange={(v) => setSelectedFormat(v as ExportFormat)}
                disabled={disabled || isLoading}
              >
                <SelectTrigger className="w-20 sm:w-24 h-7 sm:h-8 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dataFormats.includes('csv') && (
                    <SelectItem value="csv">CSV</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-7 sm:h-8 text-xs sm:text-sm"
              disabled={disabled || comingSoon || isLoading}
              onClick={handleDownload}
            >
              {isLoading && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 animate-spin" />}
              {comingSoon ? 'Coming Soon' : isPdfOnly ? 'Generate' : 'Download'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
