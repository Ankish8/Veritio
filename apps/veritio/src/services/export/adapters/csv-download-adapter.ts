/**
 * CSV Download Adapter
 *
 * Generates CSV files in batches and uploads to R2 storage.
 * Returns signed URL for download.
 */

import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type {
  AdapterConfig,
  ExportDataBatch,
  BatchWriteResult,
  RateLimitConfig,
  CSVDownloadOptions,
} from '../types'
import {
  BaseExportAdapter,
  type InitializeResult,
  type FinalizeResult,
} from './base-adapter'
import { getR2Client, getR2Bucket } from '../../storage/r2-client'

/**
 * CSV Download Adapter
 *
 * Features:
 * - Batched CSV generation (append to string buffer)
 * - Proper CSV escaping (quotes, commas, newlines)
 * - Upload to R2 storage
 * - Signed URL generation for download
 */
export class CSVDownloadAdapter extends BaseExportAdapter {
  private csvBuffer: string = ''
  private headersWritten: boolean = false
  private currentSheetName: string = 'Export'
  private totalRowsWritten: number = 0

  /**
   * Initialize the CSV export
   * No external resource creation needed - just set up config
   */
  async initialize(config: AdapterConfig): Promise<InitializeResult> {
    this.config = config
    const options = config.options as CSVDownloadOptions

    // Generate a unique storage path for this export
    const timestamp = Date.now()
    const filename = options.filename || `export-${config.studyId}`
    const sanitizedFilename = this.sanitizeFilename(filename)

    this.resourceId = `exports/${config.userId}/${config.studyId}/${timestamp}-${sanitizedFilename}.csv`
    this.csvBuffer = ''
    this.headersWritten = false
    this.totalRowsWritten = 0

    return {
      success: true,
      resourceId: this.resourceId,
    }
  }

  /**
   * Write a batch of data to the CSV buffer
   * Appends rows to the in-memory CSV string
   */
  async writeBatch(batch: ExportDataBatch): Promise<BatchWriteResult> {
    this.assertInitialized()

    try {
      // Track sheet name for multi-sheet exports
      if (batch.sheetName !== this.currentSheetName) {
        this.currentSheetName = batch.sheetName
        // Add section header for new sheet
        if (this.totalRowsWritten > 0) {
          this.csvBuffer += '\n'
        }
        this.csvBuffer += `# ${this.escapeCSVValue(batch.sheetName)}\n`
      }

      // Write headers if this is the first batch for this sheet
      if (!this.headersWritten) {
        this.csvBuffer += this.formatCSVRow(batch.headers)
        this.headersWritten = true
      }

      // Write all rows
      for (const row of batch.rows) {
        this.csvBuffer += this.formatCSVRow(row)
      }

      this.totalRowsWritten += batch.rows.length

      return {
        success: true,
        rowsWritten: batch.rows.length,
      }
    } catch (error) {
      return {
        success: false,
        rowsWritten: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Finalize the export
   * Upload CSV buffer to R2 and generate signed download URL
   */
  async finalize(): Promise<FinalizeResult> {
    this.assertInitialized()

    if (!this.resourceId) {
      throw new Error('Resource ID not set')
    }

    try {
      const client = getR2Client()
      const bucket = getR2Bucket()
      const options = this.config!.options as CSVDownloadOptions

      // Upload CSV to R2
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: this.resourceId,
        Body: this.csvBuffer,
        ContentType: 'text/csv',
        ContentDisposition: `attachment; filename="${this.getFilenameFromPath(this.resourceId)}"`,
        CacheControl: 'private, max-age=3600', // 1 hour cache
      })

      await client.send(command)

      // Generate signed URL for download
      const expirationHours = options.expirationHours || 24
      const expirationSeconds = expirationHours * 60 * 60

      const downloadUrl = await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: this.resourceId,
        }),
        { expiresIn: expirationSeconds }
      )

      // Store URL for cleanup/reference
      this.resourceUrl = downloadUrl

      return {
        success: true,
        resourceUrl: downloadUrl,
      }
    } catch (error) {
      return {
        success: false,
        resourceUrl: '',
        error: error instanceof Error ? error.message : 'Failed to upload CSV',
      }
    }
  }

  /**
   * Get rate limits for CSV generation
   * CSV is fast and local, so high throughput is allowed
   */
  getRateLimits(): RateLimitConfig {
    return {
      requestsPerSecond: 100,
      maxBatchSize: 10000,
      maxConcurrentWrites: 1,
    }
  }

  /**
   * Clean up resources on failure
   * For CSV download, we don't need to clean up R2 objects
   * since they'll be overwritten or expired
   */
  async cleanup(): Promise<void> {
    // No cleanup needed - partial uploads are harmless
    this.csvBuffer = ''
    this.headersWritten = false
    this.totalRowsWritten = 0
  }

  // ========================================================================
  // CSV Formatting Helpers
  // ========================================================================

  /**
   * Format a row of data as CSV
   * Handles proper escaping and newlines
   */
  private formatCSVRow(values: (string | number | null)[]): string {
    const escapedValues = values.map((val) => this.escapeCSVValue(val))
    return escapedValues.join(',') + '\n'
  }

  /**
   * Escape a single CSV value
   * Rules:
   * - Null/undefined → empty string
   * - Numbers → as-is
   * - Strings with quotes/commas/newlines → wrapped in quotes and escaped
   */
  private escapeCSVValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
      return ''
    }

    // Numbers can be written as-is
    if (typeof value === 'number') {
      return String(value)
    }

    const stringValue = String(value)

    // If the value contains quotes, commas, or newlines, wrap in quotes
    if (
      stringValue.includes('"') ||
      stringValue.includes(',') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r')
    ) {
      // Escape quotes by doubling them
      const escaped = stringValue.replace(/"/g, '""')
      return `"${escaped}"`
    }

    return stringValue
  }

  /**
   * Sanitize filename for safe storage
   * Remove special characters that could cause issues
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, '') // Trim leading/trailing underscores
      .substring(0, 100) // Limit length
  }

  /**
   * Extract filename from full storage path
   */
  private getFilenameFromPath(path: string): string {
    const parts = path.split('/')
    return parts[parts.length - 1] || 'export.csv'
  }
}
