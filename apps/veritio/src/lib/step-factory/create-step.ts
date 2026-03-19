/**
 * Step Factory - Create Step Function
 *
 * Factory function that generates Motia API step handlers from configuration.
 * Eliminates boilerplate for CRUD operations while maintaining full type safety.
 *
 * Usage:
 *   const step = createStep(cardsStepConfig, 'CREATE')!
 *   export const config = step.config
 *   export const handler = step.handler
 */

import type { StepConfig as MotiaStepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../supabase/motia-client'
import { standardErrorSchemas, deleteSuccessSchema } from './schemas/response-schemas'
import type {
  StepConfig,
  StepOperation,
  GeneratedStep,
  GeneratedSteps,
  ApiRequest,
  ApiHandlerContext,
  StepResponse,
  ValidationErrorDetail,
} from './types'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Maps Zod validation errors to our standard format
 */
function mapValidationErrors(error: z.ZodError): ValidationErrorDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

/**
 * Creates a validation error response
 */
function validationErrorResponse(error: z.ZodError): StepResponse {
  return {
    status: 400,
    body: {
      error: 'Validation failed',
      details: mapValidationErrors(error),
    },
  }
}

/**
 * Extracts studyId based on configuration
 */
function extractStudyId(
  req: ApiRequest,
  source: 'pathParams' | 'headers'
): string {
  if (source === 'headers') {
    return req.headers['x-study-id'] as string
  }
  return req.pathParams.studyId
}

/**
 * Wraps response body based on strategy
 */
function wrapResponse(data: unknown, strategy: 'bare' | 'data-wrapped'): unknown {
  return strategy === 'data-wrapped' ? { data } : data
}

/**
 * Enqueues an event based on strategy
 */
async function emitEvent(
  enqueue: ApiHandlerContext['enqueue'],
  strategy: 'await' | 'fire-and-forget' | 'none',
  topic: string,
  data: Record<string, unknown>
): Promise<void> {
  if (strategy === 'none') return

  if (strategy === 'await') {
    await enqueue({ topic, data })
  } else {
    enqueue({ topic, data }).catch(() => {})
  }
}

// =============================================================================
// Step Generators
// =============================================================================

/**
 * Creates a CREATE operation step
 */
function createCreateStep<TRow, TInput, TBulkItem>(
  config: StepConfig<TRow, TInput, TBulkItem>
): GeneratedStep {
  const opConfig = config.operations.create!

  const stepConfig: MotiaStepConfig = {
    name: `Create${config.entityName}`,
    description: `Create a new ${config.entityName.toLowerCase()}`,
    triggers: [{
      type: 'http',
      method: 'POST',
      path: config.basePath,
      middleware: [
        authMiddleware,
        ...(opConfig.requireOwnership !== false ? [requireStudyEditor('studyId')] : []),
        errorHandlerMiddleware,
      ],
      bodySchema: opConfig.bodySchema as any,
      responseSchema: (opConfig.responseSchema
        ? { 201: opConfig.responseSchema, ...standardErrorSchemas }
        : standardErrorSchemas) as any,
    }],
    enqueues: [opConfig.eventTopic],
    flows: config.flows,
  }

  const handler = async (
    req: ApiRequest,
    { logger, enqueue }: ApiHandlerContext
  ): Promise<StepResponse> => {
    const studyId = extractStudyId(req, config.pathConfig.studyIdSource)
    const userId = req.headers['x-user-id'] as string

    // Validate body
    const parsed = opConfig.bodySchema!.safeParse(req.body)
    if (!parsed.success) {
      logger.warn(`${config.entityName} creation validation failed`, {
        errors: parsed.error.issues,
      })
      return validationErrorResponse(parsed.error)
    }

    logger.info(`Creating ${config.entityName.toLowerCase()}`, { studyId })

    const supabase = getMotiaSupabaseClient()
    const { data, error } = await config.crudService.create(
      supabase,
      studyId,
      parsed.data as TInput
    )

    if (error) {
      logger.error(`Failed to create ${config.entityName.toLowerCase()}`, {
        studyId,
        error: error.message,
      })
      return {
        status: 500,
        body: { error: `Failed to create ${config.entityName.toLowerCase()}` },
      }
    }

    const resourceId = (data as any)?.id
    logger.info(`${config.entityName} created successfully`, {
      studyId,
      [`${config.entityName.toLowerCase()}Id`]: resourceId,
    })

    // Emit event
    await emitEvent(enqueue, opConfig.emitStrategy, opConfig.eventTopic, {
      resourceType: config.resourceType,
      resourceId,
      action: 'create',
      userId,
      studyId,
    })

    return {
      status: opConfig.successStatus || 201,
      body: wrapResponse(data, opConfig.responseWrap),
    }
  }

  return { config: stepConfig, handler }
}

/**
 * Creates an UPDATE operation step
 */
function createUpdateStep<TRow, TInput, TBulkItem>(
  config: StepConfig<TRow, TInput, TBulkItem>
): GeneratedStep {
  const opConfig = config.operations.update!
  const entityIdParam = config.pathConfig.entityIdParam

  const stepConfig: MotiaStepConfig = {
    name: `Update${config.entityName}`,
    description: `Update a ${config.entityName.toLowerCase()}`,
    triggers: [{
      type: 'http',
      method: 'PATCH',
      path: `${config.basePath}/:${entityIdParam}`,
      middleware: [
        authMiddleware,
        ...(opConfig.requireOwnership !== false ? [requireStudyEditor('studyId')] : []),
        errorHandlerMiddleware,
      ],
      bodySchema: opConfig.bodySchema as any,
      responseSchema: (opConfig.responseSchema
        ? { 200: opConfig.responseSchema, ...standardErrorSchemas }
        : standardErrorSchemas) as any,
    }],
    enqueues: [opConfig.eventTopic],
    flows: config.flows,
  }

  const handler = async (
    req: ApiRequest,
    { logger, enqueue }: ApiHandlerContext
  ): Promise<StepResponse> => {
    const studyId = extractStudyId(req, config.pathConfig.studyIdSource)
    const entityId = req.pathParams[entityIdParam]
    const userId = req.headers['x-user-id'] as string

    // Validate body
    const parsed = opConfig.bodySchema!.safeParse(req.body)
    if (!parsed.success) {
      logger.warn(`${config.entityName} update validation failed`, {
        errors: parsed.error.issues,
      })
      return validationErrorResponse(parsed.error)
    }

    logger.info(`Updating ${config.entityName.toLowerCase()}`, {
      studyId,
      [entityIdParam]: entityId,
    })

    const supabase = getMotiaSupabaseClient()
    const { data, error } = await config.crudService.update(
      supabase,
      entityId,
      studyId,
      parsed.data as Partial<TInput>
    )

    if (error) {
      // Check for not found errors
      if (error.message === `${config.entityName} not found`) {
        logger.warn(`${config.entityName} not found for update`, {
          studyId,
          [entityIdParam]: entityId,
        })
        return {
          status: 404,
          body: { error: `${config.entityName} not found` },
        }
      }

      logger.error(`Failed to update ${config.entityName.toLowerCase()}`, {
        studyId,
        [entityIdParam]: entityId,
        error: error.message,
      })
      return {
        status: 500,
        body: { error: `Failed to update ${config.entityName.toLowerCase()}` },
      }
    }

    logger.info(`${config.entityName} updated successfully`, {
      studyId,
      [entityIdParam]: entityId,
    })

    // Emit event
    await emitEvent(enqueue, opConfig.emitStrategy, opConfig.eventTopic, {
      resourceType: config.resourceType,
      resourceId: entityId,
      action: 'update',
      userId,
      studyId,
    })

    return {
      status: 200,
      body: wrapResponse(data, opConfig.responseWrap),
    }
  }

  return { config: stepConfig, handler }
}

/**
 * Creates a DELETE operation step
 */
function createDeleteStep<TRow, TInput, TBulkItem>(
  config: StepConfig<TRow, TInput, TBulkItem>
): GeneratedStep {
  const opConfig = config.operations.delete!
  const entityIdParam = config.pathConfig.entityIdParam

  const stepConfig: MotiaStepConfig = {
    name: `Delete${config.entityName}`,
    description: `Delete a ${config.entityName.toLowerCase()}`,
    triggers: [{
      type: 'http',
      method: 'DELETE',
      path: `${config.basePath}/:${entityIdParam}`,
      middleware: [
        authMiddleware,
        ...(opConfig.requireOwnership !== false ? [requireStudyEditor('studyId')] : []),
        errorHandlerMiddleware,
      ],
      responseSchema: {
        200: deleteSuccessSchema,
        ...standardErrorSchemas,
      } as any,
    }],
    enqueues: [opConfig.eventTopic],
    flows: config.flows,
  }

  const handler = async (
    req: ApiRequest,
    { logger, enqueue }: ApiHandlerContext
  ): Promise<StepResponse> => {
    const studyId = extractStudyId(req, config.pathConfig.studyIdSource)
    const entityId = req.pathParams[entityIdParam]
    const userId = req.headers['x-user-id'] as string

    logger.info(`Deleting ${config.entityName.toLowerCase()}`, {
      studyId,
      [entityIdParam]: entityId,
    })

    const supabase = getMotiaSupabaseClient()
    const { success, error } = await config.crudService.delete(
      supabase,
      entityId,
      studyId
    )

    if (error) {
      logger.error(`Failed to delete ${config.entityName.toLowerCase()}`, {
        studyId,
        [entityIdParam]: entityId,
        error: error.message,
      })
      return {
        status: 500,
        body: { error: `Failed to delete ${config.entityName.toLowerCase()}` },
      }
    }

    logger.info(`${config.entityName} deleted successfully`, {
      studyId,
      [entityIdParam]: entityId,
    })

    // Emit event
    await emitEvent(enqueue, opConfig.emitStrategy, opConfig.eventTopic, {
      resourceType: config.resourceType,
      resourceId: entityId,
      action: 'delete',
      userId,
      studyId,
    })

    return {
      status: 200,
      body: { success },
    }
  }

  return { config: stepConfig, handler }
}

/**
 * Creates a LIST operation step
 *
 * Note: LIST operations don't use requireStudyEditor, so studyId is always
 * extracted from pathParams regardless of the config's studyIdSource setting.
 * Ownership is verified in the CRUD service via the userId parameter.
 */
function createListStep<TRow, TInput, TBulkItem>(
  config: StepConfig<TRow, TInput, TBulkItem>
): GeneratedStep {
  const opConfig = config.operations.list!

  const stepConfig: MotiaStepConfig = {
    name: `List${config.entityNamePlural}`,
    description: `List all ${config.entityNamePlural.toLowerCase()} for a study`,
    triggers: [{
      type: 'http',
      method: 'GET',
      path: config.basePath,
      middleware: [authMiddleware, errorHandlerMiddleware],
      responseSchema: (opConfig.responseSchema
        ? { 200: opConfig.responseSchema, ...standardErrorSchemas }
        : standardErrorSchemas) as any,
    }],
    enqueues: [opConfig.eventTopic],
    flows: config.flows,
  }

  const handler = async (
    req: ApiRequest,
    { logger, enqueue }: ApiHandlerContext
  ): Promise<StepResponse> => {
    // LIST operations always use pathParams since they don't have requireStudyEditor
    // Ownership is verified in the CRUD service via the userId parameter
    const studyId = req.pathParams.studyId
    const userId = req.headers['x-user-id'] as string

    logger.info(`Listing ${config.entityNamePlural.toLowerCase()}`, {
      studyId,
      userId,
    })

    const supabase = getMotiaSupabaseClient()
    const { data, error } = await config.crudService.list(supabase, studyId, userId)

    if (error) {
      logger.error(`Failed to list ${config.entityNamePlural.toLowerCase()}`, {
        studyId,
        error: error.message,
      })
      return {
        status: 500,
        body: { error: `Failed to fetch ${config.entityNamePlural.toLowerCase()}` },
      }
    }

    const items = data || []
    logger.info(`${config.entityNamePlural} listed successfully`, {
      studyId,
      count: items.length,
    })

    // Fire-and-forget for list operations
    await emitEvent(enqueue, opConfig.emitStrategy, opConfig.eventTopic, {
      resourceType: config.resourceType,
      action: 'list',
      userId,
      studyId,
      count: items.length,
    })

    return {
      status: 200,
      body: wrapResponse(items, opConfig.responseWrap),
    }
  }

  return { config: stepConfig, handler }
}

/**
 * Creates a BULK_UPDATE operation step
 */
function createBulkUpdateStep<TRow, TInput, TBulkItem>(
  config: StepConfig<TRow, TInput, TBulkItem>
): GeneratedStep {
  const opConfig = config.operations.bulkUpdate!
  // If bulkItemsKey is set, body is wrapped in object; otherwise body is direct array
  const isWrapped = !!opConfig.bulkItemsKey
  const itemsKey = opConfig.bulkItemsKey

  const stepConfig: MotiaStepConfig = {
    name: `BulkUpdate${config.entityNamePlural}`,
    description: `Bulk update ${config.entityNamePlural.toLowerCase()} (sync with client state)`,
    triggers: [{
      type: 'http',
      method: 'PUT',
      path: config.basePath,
      middleware: [
        authMiddleware,
        ...(opConfig.requireOwnership !== false ? [requireStudyEditor('studyId')] : []),
        errorHandlerMiddleware,
      ],
      bodySchema: opConfig.bulkBodySchema as any,
      responseSchema: (opConfig.responseSchema
        ? { 200: opConfig.responseSchema, ...standardErrorSchemas }
        : standardErrorSchemas) as any,
    }],
    enqueues: [opConfig.eventTopic],
    flows: config.flows,
  }

  const handler = async (
    req: ApiRequest,
    { logger, enqueue }: ApiHandlerContext
  ): Promise<StepResponse> => {
    const studyId = extractStudyId(req, config.pathConfig.studyIdSource)
    const userId = req.headers['x-user-id'] as string

    // Validate body
    const parsed = opConfig.bulkBodySchema!.safeParse(req.body)
    if (!parsed.success) {
      logger.warn('Bulk update validation failed', {
        errors: parsed.error.issues,
      })
      return validationErrorResponse(parsed.error)
    }

    // Extract items - either from wrapped object or directly from array
    const items: TBulkItem[] = isWrapped
      ? (parsed.data as Record<string, TBulkItem[]>)[itemsKey!]
      : (parsed.data as TBulkItem[])

    logger.info(`Bulk updating ${config.entityNamePlural.toLowerCase()}`, {
      studyId,
      count: items.length,
    })

    const supabase = getMotiaSupabaseClient()
    const { data, error } = await config.crudService.bulkUpdate(
      supabase,
      studyId,
      items
    )

    if (error) {
      logger.error(`Failed to bulk update ${config.entityNamePlural.toLowerCase()}`, {
        studyId,
        error: error.message,
      })
      return {
        status: 500,
        body: { error: `Failed to update ${config.entityNamePlural.toLowerCase()}` },
      }
    }

    const updatedItems = data || []
    logger.info(`${config.entityNamePlural} bulk updated successfully`, {
      studyId,
      count: updatedItems.length,
    })

    // Emit event
    await emitEvent(enqueue, opConfig.emitStrategy, opConfig.eventTopic, {
      resourceType: config.resourceType,
      action: 'bulk-update',
      userId,
      studyId,
      count: updatedItems.length,
    })

    return {
      status: 200,
      body: wrapResponse(updatedItems, opConfig.responseWrap),
    }
  }

  return { config: stepConfig, handler }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Creates all configured steps for an entity
 *
 * @example
 * const steps = createSteps(cardsStepConfig)
 * export const { config, handler } = steps.CREATE!
 */
export function createSteps<TRow, TInput, TBulkItem>(
  config: StepConfig<TRow, TInput, TBulkItem>
): GeneratedSteps {
  return {
    CREATE: config.operations.create ? createCreateStep(config) : null,
    UPDATE: config.operations.update ? createUpdateStep(config) : null,
    DELETE: config.operations.delete ? createDeleteStep(config) : null,
    LIST: config.operations.list ? createListStep(config) : null,
    GET: null,
    BULK_UPDATE: config.operations.bulkUpdate ? createBulkUpdateStep(config) : null,
  }
}

/**
 * Generator lookup for dispatching directly to the correct step generator.
 * Avoids building all 5 steps when only one is needed.
 */
const stepGenerators: Record<StepOperation, <TRow, TInput, TBulkItem>(
  config: StepConfig<TRow, TInput, TBulkItem>
) => GeneratedStep | null> = {
  CREATE: (config) => config.operations.create ? createCreateStep(config) : null,
  UPDATE: (config) => config.operations.update ? createUpdateStep(config) : null,
  DELETE: (config) => config.operations.delete ? createDeleteStep(config) : null,
  LIST: (config) => config.operations.list ? createListStep(config) : null,
  GET: () => null,
  BULK_UPDATE: (config) => config.operations.bulkUpdate ? createBulkUpdateStep(config) : null,
}

/**
 * Creates a single step for an entity.
 * Dispatches directly to the specific generator instead of building all steps.
 *
 * @example
 * const step = createStep(cardsStepConfig, 'CREATE')!
 * export const config = step.config
 * export const handler = step.handler
 */
export function createStep<TRow, TInput, TBulkItem>(
  config: StepConfig<TRow, TInput, TBulkItem>,
  operation: StepOperation
): GeneratedStep | null {
  return stepGenerators[operation](config)
}
