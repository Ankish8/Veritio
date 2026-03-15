'use client'

import { useState, useCallback } from 'react'
import { Button } from '@veritio/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@veritio/ui/components/dropdown-menu'
import {
  Download,
  Image,
  FileCode,
  FileSpreadsheet,
  FileText,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import {
  exportToPNG,
  exportToSVG,
  exportToCSV,
  generatePDFReport,
  type PDFReportData,
  type CSVExportData,
} from './export-service'

type ExportFormat = 'png' | 'svg' | 'csv' | 'pdf'

interface ExportOption {
  format: ExportFormat
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

interface ExportButtonProps {
  formats?: ExportFormat[]
  captureRef?: React.RefObject<HTMLElement | null>
  filenamePrefix: string
  getCsvData?: () => CSVExportData
  getPdfData?: () => PDFReportData
  onExportStart?: (format: ExportFormat) => void
  onExportComplete?: (format: ExportFormat) => void
  onExportError?: (format: ExportFormat, error: Error) => void
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  disabled?: boolean
  className?: string
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: 'png',
    label: 'Export as PNG',
    description: 'High-resolution image',
    icon: Image,
  },
  {
    format: 'svg',
    label: 'Export as SVG',
    description: 'Scalable vector graphic',
    icon: FileCode,
  },
  {
    format: 'csv',
    label: 'Export as CSV',
    description: 'Spreadsheet data',
    icon: FileSpreadsheet,
  },
  {
    format: 'pdf',
    label: 'Export as PDF',
    description: 'Full report',
    icon: FileText,
  },
]

export function ExportButton({
  formats = ['png', 'svg', 'csv', 'pdf'],
  captureRef,
  filenamePrefix,
  getCsvData,
  getPdfData,
  onExportStart,
  onExportComplete,
  onExportError,
  variant = 'outline',
  size = 'sm',
  disabled = false,
  className,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [currentFormat, setCurrentFormat] = useState<ExportFormat | null>(null)

  const availableOptions = EXPORT_OPTIONS.filter(opt => formats.includes(opt.format))

  const handleExport = useCallback(async (format: ExportFormat) => {
    setIsExporting(true)
    setCurrentFormat(format)
    onExportStart?.(format)

    const timestamp = new Date().toISOString().slice(0, 10)
    const filename = `${filenamePrefix}-${timestamp}`

    try {
      switch (format) {
        case 'png':
          if (!captureRef?.current) {
            throw new Error('No element to capture')
          }
          await exportToPNG(captureRef.current, { filename })
          break

        case 'svg':
          if (!captureRef?.current) {
            throw new Error('No element to capture')
          }
          await exportToSVG(captureRef.current, { filename })
          break

        case 'csv':
          if (!getCsvData) {
            throw new Error('CSV data generator not provided')
          }
          exportToCSV(getCsvData(), filename)
          break

        case 'pdf':
          if (!getPdfData) {
            throw new Error('PDF data generator not provided')
          }
          await generatePDFReport(getPdfData(), { filename })
          break
      }

      onExportComplete?.(format)
    } catch (error) {
      console.error(`[ExportButton] Export failed for ${format}:`, error)
      onExportError?.(format, error instanceof Error ? error : new Error(String(error)))
    } finally {
      setIsExporting(false)
      setCurrentFormat(null)
    }
  }, [captureRef, filenamePrefix, getCsvData, getPdfData, onExportStart, onExportComplete, onExportError])

  // Check if specific formats are available
  const canExportImage = !!captureRef
  const canExportCsv = !!getCsvData
  const canExportPdf = !!getPdfData

  const isOptionDisabled = (format: ExportFormat): boolean => {
    switch (format) {
      case 'png':
      case 'svg':
        return !canExportImage
      case 'csv':
        return !canExportCsv
      case 'pdf':
        return !canExportPdf
      default:
        return false
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting}
          className={className}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export
              <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {availableOptions.map((option, index) => {
          const Icon = option.icon
          const isDisabled = isExporting || isOptionDisabled(option.format)
          const isCurrentlyExporting = currentFormat === option.format

          return (
            <div key={option.format}>
              {index > 0 && option.format === 'csv' && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem
                onClick={() => handleExport(option.format)}
                disabled={isDisabled}
                className="flex flex-col items-start py-2"
              >
                <div className="flex items-center w-full">
                  {isCurrentlyExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 mr-2" />
                  )}
                  <span>{option.label}</span>
                </div>
                <span className="text-xs text-muted-foreground ml-6">
                  {option.description}
                </span>
              </DropdownMenuItem>
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface SimpleExportButtonProps {
  captureRef: React.RefObject<HTMLElement | null>
  filenamePrefix: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function PngExportButton({
  captureRef,
  filenamePrefix,
  variant = 'outline',
  size = 'sm',
  className,
}: SimpleExportButtonProps) {
  return (
    <ExportButton
      formats={['png']}
      captureRef={captureRef}
      filenamePrefix={filenamePrefix}
      variant={variant}
      size={size}
      className={className}
    />
  )
}
export function ImageExportButton({
  captureRef,
  filenamePrefix,
  variant = 'outline',
  size = 'sm',
  className,
}: SimpleExportButtonProps) {
  return (
    <ExportButton
      formats={['png', 'svg']}
      captureRef={captureRef}
      filenamePrefix={filenamePrefix}
      variant={variant}
      size={size}
      className={className}
    />
  )
}
