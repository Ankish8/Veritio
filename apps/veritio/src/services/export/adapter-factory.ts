/**
 * Export Adapter Factory
 *
 * Creates the appropriate adapter instance based on the integration type.
 */

import type { ExportIntegration } from './types'
import type { ExportAdapter } from './adapters/base-adapter'
import { GoogleSheetsAdapter } from './adapters/google-sheets-adapter'
import { CSVDownloadAdapter } from './adapters/csv-download-adapter'

/**
 * Create an export adapter for the specified integration
 *
 * @param integration - The integration type to export to
 * @returns Adapter instance for the integration
 * @throws If integration is not supported
 */
export function createExportAdapter(integration: ExportIntegration): ExportAdapter {
  switch (integration) {
    case 'googlesheets':
      return new GoogleSheetsAdapter()

    case 'csv_download':
      return new CSVDownloadAdapter()

    case 'googledocs':
      // TODO: Implement GoogleDocsAdapter
      throw new Error('Google Docs export not yet implemented')

    case 'notion':
      // TODO: Implement NotionAdapter
      throw new Error('Notion export not yet implemented')

    case 'airtable':
      // TODO: Implement AirtableAdapter
      throw new Error('Airtable export not yet implemented')

    default:
      throw new Error(`Unsupported integration: ${integration}`)
  }
}

/**
 * Check if an integration is supported
 *
 * @param integration - The integration to check
 * @returns True if the integration is supported
 */
export function isIntegrationSupported(integration: ExportIntegration): boolean {
  return integration === 'googlesheets' || integration === 'csv_download'
}

/**
 * Get list of supported integrations
 *
 * @returns Array of supported integration types
 */
export function getSupportedIntegrations(): ExportIntegration[] {
  return ['googlesheets', 'csv_download']
}
