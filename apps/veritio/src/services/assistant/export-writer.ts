/**
 * Export Writer — Server-side integration data writer
 *
 * Writes pre-formatted export data directly to connected integrations
 * without requiring the LLM to copy data through its output. Data is
 * cached in memory by export_study_data and fetched here by dataRef.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { executeAction, getComposioConnection } from '../composio/index'

export interface ExportSheet {
  name: string
  headers: string[]
  rows: (string | number)[][]
}

interface SheetWriteDetail {
  sheet: string
  ok: boolean
  rows?: number
  error?: string
}

export interface WriteResult {
  url: string | null
  error: string | null
  details: SheetWriteDetail[]
}

/**
 * Write export sheets to a connected integration.
 * Currently supports: googlesheets. Returns error for unsupported toolkits.
 */
export async function writeExportToIntegration(
  sheets: ExportSheet[],
  toolkit: string,
  title: string,
  userId: string,
  supabase: SupabaseClient,
  onProgress?: (toolName: string, description: string, phase: 'start' | 'done') => void,
): Promise<WriteResult> {
  switch (toolkit) {
    case 'googlesheets':
      return writeToGoogleSheets(sheets, title, userId, supabase, onProgress)
    default:
      return {
        url: null,
        error: `Direct export to "${toolkit}" is not yet supported. Currently supported: googlesheets. For other integrations, use get_integration_tools + execute_integration_batch.`,
        details: [],
      }
  }
}

async function writeToGoogleSheets(
  sheets: ExportSheet[],
  title: string,
  userId: string,
  supabase: SupabaseClient,
  onProgress?: (toolName: string, description: string, phase: 'start' | 'done') => void,
): Promise<WriteResult> {
  // Get connection
  const { data: connection } = await getComposioConnection(supabase, userId, 'googlesheets')
  if (!connection) {
    return { url: null, error: 'Google Sheets is not connected. Connect it via the + button in the integration bar.', details: [] }
  }
  const connAccountId = connection.composio_account_id ?? undefined

  const details: SheetWriteDetail[] = []

  // 1. Create spreadsheet
  onProgress?.('GOOGLESHEETS_CREATE', 'Creating spreadsheet...', 'start')
  const createResult = await executeAction(userId, 'GOOGLESHEETS_CREATE_GOOGLE_SHEET1', { title }, connAccountId)

  if (createResult.error) {
    onProgress?.('GOOGLESHEETS_CREATE', 'Failed to create spreadsheet', 'done')
    return { url: null, error: `Failed to create spreadsheet: ${createResult.error.message}`, details: [] }
  }
  onProgress?.('GOOGLESHEETS_CREATE', 'Spreadsheet created', 'done')

  // Extract spreadsheet ID from various response shapes
  const resultData = createResult.data as Record<string, unknown> | null
  let spreadsheetId: string | undefined

  if (resultData) {
    // Google Sheets CREATE returns nested: {NewSpreadsheet: {spreadsheetId: "..."}}
    if (resultData.NewSpreadsheet && typeof resultData.NewSpreadsheet === 'object') {
      spreadsheetId = (resultData.NewSpreadsheet as Record<string, unknown>).spreadsheetId as string
    }
    spreadsheetId ??= resultData.spreadsheetId as string
    spreadsheetId ??= resultData.spreadsheet_id as string
    spreadsheetId ??= resultData.id as string
  }

  if (!spreadsheetId) {
    return {
      url: null,
      error: `Created spreadsheet but could not extract ID. Response: ${JSON.stringify(resultData).slice(0, 300)}`,
      details: [],
    }
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`

  // 2. Write each sheet
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i]

    // First sheet uses default "Sheet1"; subsequent sheets need ADD_SHEET
    let targetSheetName: string
    if (i === 0) {
      targetSheetName = 'Sheet1'
    } else {
      targetSheetName = sheet.name
      onProgress?.('GOOGLESHEETS_ADD_SHEET', `Adding sheet "${sheet.name}"...`, 'start')
      const addResult = await executeAction(userId, 'GOOGLESHEETS_ADD_SHEET', {
        spreadsheet_id: spreadsheetId,
        title: sheet.name,
      }, connAccountId)

      if (addResult.error) {
        onProgress?.('GOOGLESHEETS_ADD_SHEET', `Failed to add sheet "${sheet.name}"`, 'done')
        details.push({ sheet: sheet.name, ok: false, error: `Failed to add sheet: ${addResult.error.message}` })
        continue
      }
      onProgress?.('GOOGLESHEETS_ADD_SHEET', `Added sheet "${sheet.name}"`, 'done')
    }

    // Build values: headers row + data rows, all as strings
    const values = [
      sheet.headers.map(String),
      ...sheet.rows.map((row) => row.map((cell) => (cell == null ? '' : String(cell)))),
    ]

    onProgress?.('GOOGLESHEETS_BATCH_UPDATE', `Writing "${sheet.name}" (${sheet.rows.length} rows)...`, 'start')
    const writeResult = await executeAction(userId, 'GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: spreadsheetId,
      sheet_name: targetSheetName,
      first_cell_location: 'A1',
      values,
    }, connAccountId)

    if (writeResult.error) {
      onProgress?.('GOOGLESHEETS_BATCH_UPDATE', `Failed to write "${sheet.name}"`, 'done')
      details.push({ sheet: sheet.name, ok: false, error: `Failed to write: ${writeResult.error.message}` })
    } else {
      onProgress?.('GOOGLESHEETS_BATCH_UPDATE', `Wrote "${sheet.name}" (${sheet.rows.length} rows)`, 'done')
      details.push({ sheet: sheet.name, ok: true, rows: sheet.rows.length })
    }
  }

  return { url, error: null, details }
}
