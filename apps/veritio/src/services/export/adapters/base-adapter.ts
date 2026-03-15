/**
 * Base Export Adapter Interface
 *
 * Defines the contract for all export integration adapters.
 * Each adapter handles the specifics of writing batched data
 * to a particular external service (Google Sheets, Notion, etc.).
 */

import type {
  AdapterConfig,
  ExportDataBatch,
  BatchWriteResult,
  RateLimitConfig,
} from '../types'

/**
 * Result of export initialization
 */
export interface InitializeResult {
  success: boolean
  resourceId?: string
  resourceUrl?: string
  error?: string
}

/**
 * Result of export finalization
 */
export interface FinalizeResult {
  success: boolean
  resourceUrl: string
  error?: string
}

/**
 * Base interface that all export adapters must implement
 */
export interface ExportAdapter {
  /**
   * Initialize the export (create spreadsheet, document, database, etc.)
   *
   * @param config - Export configuration
   * @returns Result with resource ID and URL
   * @throws On initialization failure
   */
  initialize(config: AdapterConfig): Promise<InitializeResult>

  /**
   * Write a batch of data to the export target
   *
   * @param batch - Batch data with headers and rows
   * @returns Result indicating success and rows written
   * @throws On write failure (will be caught and retried if transient)
   */
  writeBatch(batch: ExportDataBatch): Promise<BatchWriteResult>

  /**
   * Finalize the export (share permissions, return final URL, etc.)
   *
   * @returns Final shareable URL to the exported resource
   * @throws On finalization failure
   */
  finalize(): Promise<FinalizeResult>

  /**
   * Get rate limit configuration for this adapter
   *
   * @returns Rate limit settings to throttle requests
   */
  getRateLimits(): RateLimitConfig

  /**
   * Clean up any resources on failure
   *
   * Optional method to delete partially created resources
   */
  cleanup?(): Promise<void>
}

/**
 * Base class with common utilities for adapters
 */
export abstract class BaseExportAdapter implements ExportAdapter {
  protected config?: AdapterConfig
  protected resourceId?: string
  protected resourceUrl?: string

  abstract initialize(config: AdapterConfig): Promise<InitializeResult>
  abstract writeBatch(batch: ExportDataBatch): Promise<BatchWriteResult>
  abstract finalize(): Promise<FinalizeResult>
  abstract getRateLimits(): RateLimitConfig

  /**
   * Validate that the adapter has been initialized
   */
  protected assertInitialized(): void {
    if (!this.config || !this.resourceId) {
      throw new Error('Adapter not initialized. Call initialize() first.')
    }
  }

  /**
   * Helper to classify errors for retry logic
   */
  protected isTransientError(error: Error): boolean {
    const transientPatterns = [
      'timeout',
      'network',
      'rate limit',
      'econnreset',
      'enotfound',
      'socket hang',
      'too many requests',
      '429',
      '503',
      '504',
    ]

    const message = error.message.toLowerCase()
    return transientPatterns.some((pattern) => message.includes(pattern))
  }

  /**
   * Helper to extract retry delay from rate limit errors
   */
  protected getRetryDelay(error: Error): number | undefined {
    // Check for Retry-After header in error message
    const retryMatch = error.message.match(/retry after (\d+)/i)
    if (retryMatch) {
      return parseInt(retryMatch[1], 10) * 1000 // Convert to ms
    }

    // Default backoff for rate limits
    if (error.message.toLowerCase().includes('rate limit')) {
      return 60000 // 1 minute
    }

    return undefined
  }
}
