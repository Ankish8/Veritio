/**
 * Google Sheets Export Adapter
 *
 * Handles export of study data to Google Sheets using Composio.
 * Creates a new spreadsheet, writes batched data, and returns the shareable URL.
 */

import { BaseExportAdapter } from './base-adapter'
import type {
  AdapterConfig,
  ExportDataBatch,
  BatchWriteResult,
  RateLimitConfig,
} from '../types'
import type { InitializeResult, FinalizeResult } from './base-adapter'
import { executeAction } from '../../composio/index'

/**
 * Google Sheets adapter implementation
 */
export class GoogleSheetsAdapter extends BaseExportAdapter {
  private spreadsheetId?: string
  private nextRowIndex = 1 // Track next available row (1-indexed)
  private sheetsCreated = new Set<string>() // Track which sheet names we've created

  /**
   * Initialize: Create a new Google Sheets spreadsheet
   */
  async initialize(config: AdapterConfig): Promise<InitializeResult> {
    this.config = config

    try {
      // Extract spreadsheet name from options or use default
      const spreadsheetName = ((config.options as any)?.spreadsheetName as string) || `Export ${config.studyId}`

      // Create spreadsheet via Composio
      const result = await executeAction(
        config.userId,
        'GOOGLESHEETS_CREATE_GOOGLE_SHEET1',
        { title: spreadsheetName }
      )

      if (result.error) {
        return {
          success: false,
          error: `Failed to create spreadsheet: ${result.error.message}`,
        }
      }

      // Extract spreadsheet ID and URL from result
      // Composio response shape: { spreadsheetId, spreadsheetUrl }
      const data = result.data as { spreadsheetId?: string; spreadsheetUrl?: string } | null

      if (!data?.spreadsheetId) {
        return {
          success: false,
          error: 'Spreadsheet created but no ID returned',
        }
      }

      this.spreadsheetId = data.spreadsheetId
      this.resourceId = data.spreadsheetId
      this.resourceUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`

      return {
        success: true,
        resourceId: this.resourceId,
        resourceUrl: this.resourceUrl,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: `Failed to initialize Google Sheets export: ${message}`,
      }
    }
  }

  /**
   * Write a batch of data to the spreadsheet
   */
  async writeBatch(batch: ExportDataBatch): Promise<BatchWriteResult> {
    this.assertInitialized()

    if (!this.spreadsheetId) {
      return {
        success: false,
        rowsWritten: 0,
        error: 'Spreadsheet ID not set',
      }
    }

    try {
      const { sheetName, headers, rows } = batch

      // If this is a new sheet, create it first
      if (!this.sheetsCreated.has(sheetName)) {
        await this.createSheet(sheetName)
        this.sheetsCreated.add(sheetName)
        this.nextRowIndex = 1 // Reset row index for new sheet
      }

      // Prepare data for batch update: headers + rows
      const allRows: (string | number | null)[][] = []

      // Include headers on first write (row 1)
      if (this.nextRowIndex === 1) {
        allRows.push(headers)
      }

      allRows.push(...rows)

      if (allRows.length === 0) {
        return {
          success: true,
          rowsWritten: 0,
        }
      }

      // Calculate first cell location (A1 notation)
      const firstCellLocation = `A${this.nextRowIndex}`

      // Execute batch update via Composio
      // GOOGLESHEETS_BATCH_UPDATE requires: spreadsheet_id, sheet_name, values, first_cell_location
      const result = await executeAction(
        this.config!.userId,
        'GOOGLESHEETS_BATCH_UPDATE',
        {
          spreadsheet_id: this.spreadsheetId,
          sheet_name: sheetName,
          values: allRows,
          first_cell_location: firstCellLocation,
        }
      )

      if (result.error) {
        // Check if this is a transient error
        if (this.isTransientError(result.error)) {
          return {
            success: false,
            rowsWritten: 0,
            error: `Transient error: ${result.error.message}`,
          }
        }

        return {
          success: false,
          rowsWritten: 0,
          error: `Failed to write batch: ${result.error.message}`,
        }
      }

      // Update next row index
      this.nextRowIndex += allRows.length

      return {
        success: true,
        rowsWritten: rows.length, // Don't count header in rows written
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        rowsWritten: 0,
        error: message,
      }
    }
  }

  /**
   * Finalize the export: return the spreadsheet URL
   */
  async finalize(): Promise<FinalizeResult> {
    this.assertInitialized()

    if (!this.resourceUrl) {
      return {
        success: false,
        resourceUrl: '',
        error: 'Resource URL not set',
      }
    }

    // Google Sheets are already shareable via the URL
    // No additional finalization needed
    return {
      success: true,
      resourceUrl: this.resourceUrl,
    }
  }

  /**
   * Get rate limits for Google Sheets API
   */
  getRateLimits(): RateLimitConfig {
    return {
      requestsPerSecond: 1, // Conservative: 1 request per second
      maxBatchSize: 1000, // 1000 rows per batch
      maxConcurrentWrites: 1, // Sequential writes only
    }
  }

  /**
   * Create a new sheet within the spreadsheet
   */
  private async createSheet(sheetName: string): Promise<void> {
    if (!this.spreadsheetId) {
      throw new Error('Spreadsheet ID not set')
    }

    // Skip creating the default sheet (it already exists)
    if (sheetName === 'Sheet1') {
      return
    }

    const result = await executeAction(
      this.config!.userId,
      'GOOGLESHEETS_ADD_SHEET',
      {
        spreadsheet_id: this.spreadsheetId,
        title: sheetName,
      }
    )

    if (result.error) {
      throw new Error(`Failed to create sheet "${sheetName}": ${result.error.message}`)
    }
  }

  /**
   * Clean up partially created spreadsheet on failure
   */
  async cleanup(): Promise<void> {
    // Google Sheets doesn't have a direct delete API via Composio
    // The spreadsheet will remain in the user's Drive
    // They can manually delete it if needed

    // Reset internal state
    this.spreadsheetId = undefined
    this.resourceId = undefined
    this.resourceUrl = undefined
    this.nextRowIndex = 1
    this.sheetsCreated.clear()
  }
}
