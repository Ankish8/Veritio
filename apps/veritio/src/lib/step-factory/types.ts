/**
 * Step Factory Types
 *
 * Type definitions for the step factory that generates Motia API handlers
 * from configuration objects. Follows the pattern of crud-factory.
 */

import type { z } from 'zod'
import type { StepConfig as MotiaStepConfig } from 'motia'
import type { CrudService } from '../crud-factory/types'
import type { ApiRequest, ApiHandlerContext } from '../motia/types'

// Re-export for convenience
export type { ApiRequest, ApiHandlerContext }

/**
 * Operation types supported by the step factory
 */
export type StepOperation = 'CREATE' | 'UPDATE' | 'DELETE' | 'LIST' | 'GET' | 'BULK_UPDATE'

/**
 * Emit strategy for event emission
 * - 'await': Wait for emit to complete (mutations)
 * - 'fire-and-forget': Don't wait, catch errors silently (reads)
 * - 'none': Don't emit any event
 */
export type EmitStrategy = 'await' | 'fire-and-forget' | 'none'

/**
 * Response wrapping strategy
 * - 'bare': Return data directly (cards, categories pattern)
 * - 'data-wrapped': Wrap in { data: ... } (tasks, tree-nodes pattern)
 */
export type ResponseWrapStrategy = 'bare' | 'data-wrapped'

/**
 * Parameter extraction source for studyId
 * - 'pathParams': Extract from req.pathParams.studyId (tasks, tree-nodes)
 * - 'headers': Extract from req.headers['x-study-id'] (cards, categories)
 */
export type StudyIdSource = 'pathParams' | 'headers'

/**
 * Configuration for a single step operation
 */
export interface StepOperationConfig<TInput = unknown, TBulkInput = unknown> {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

  /** Path suffix relative to base path (e.g., '/:cardId' for update/delete) */
  pathSuffix?: string

  /** Zod schema for body validation (CREATE, UPDATE) */
  bodySchema?: z.ZodSchema<TInput>

  /** Zod schema for bulk body (BULK_UPDATE) - can be wrapped or direct array */
  bulkBodySchema?: z.ZodSchema<{ [key: string]: TBulkInput[] }> | z.ZodSchema<TBulkInput[]>

  /** Key for bulk items in body (e.g., 'cards', 'categories'). If not set, body is treated as direct array */
  bulkItemsKey?: string

  /** Event topic to emit on success */
  eventTopic: string

  /** Emit strategy */
  emitStrategy: EmitStrategy

  /** Response wrap strategy */
  responseWrap: ResponseWrapStrategy

  /** Success status code (default: 200 for UPDATE/DELETE/LIST, 201 for CREATE) */
  successStatus?: number

  /** Response schema for success (optional, for Motia docs) */
  responseSchema?: z.ZodSchema

  /** Whether to require requireStudyEditor permission check (default: true for mutations) */
  requireOwnership?: boolean
}

/**
 * Entity path parameter configuration
 */
export interface EntityPathConfig {
  /** Name of the entity ID parameter (e.g., 'cardId', 'categoryId') */
  entityIdParam: string

  /** Where to extract studyId from */
  studyIdSource: StudyIdSource
}

/**
 * Complete step configuration for an entity
 */
export interface StepConfig<TRow, TInput, TBulkItem> {
  /** Entity name (singular, PascalCase) for step names and logging (e.g., 'Card') */
  entityName: string

  /** Entity name (plural, PascalCase) for list steps (e.g., 'Cards') */
  entityNamePlural: string

  /** Resource type for events (lowercase, e.g., 'card', 'category') */
  resourceType: string

  /** Base path for all operations (e.g., '/api/studies/:studyId/cards') */
  basePath: string

  /** Path parameter configuration */
  pathConfig: EntityPathConfig

  /** Flows for all steps (passed to Motia config) */
  flows: string[]

  /** Reference to the CRUD service from crud-factory */
  crudService: CrudService<TRow, TInput, TBulkItem>

  /** Operation configurations */
  operations: {
    create?: StepOperationConfig<TInput>
    update?: StepOperationConfig<Partial<TInput>>
    delete?: StepOperationConfig
    list?: StepOperationConfig
    get?: StepOperationConfig
    bulkUpdate?: StepOperationConfig<unknown, TBulkItem>
  }
}

/**
 * Generated step exports (config + handler)
 */
export interface GeneratedStep {
  config: MotiaStepConfig
  handler: (req: ApiRequest, ctx: ApiHandlerContext) => Promise<StepResponse>
}

/**
 * Step response type
 */
export interface StepResponse {
  status: number
  body: unknown
}

/**
 * Validation error detail format
 */
export interface ValidationErrorDetail {
  path: string
  message: string
}

/**
 * Validation error response body
 */
export interface ValidationErrorBody {
  error: string
  details: ValidationErrorDetail[]
}

/**
 * Error response body
 */
export interface ErrorBody {
  error: string
}

/**
 * Result type from createSteps
 */
export type GeneratedSteps = Record<StepOperation, GeneratedStep | null>
