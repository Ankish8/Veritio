/**
 * Step Factory - Main Exports
 *
 * Factory for generating Motia API step handlers from configuration.
 * Follows the pattern established by crud-factory.
 *
 * @example
 * // In step file:
 * import { createStep } from './index'
 * import { cardsStepConfig } from './configs/index'
 *
 * const step = createStep(cardsStepConfig, 'CREATE')!
 * export const config = step.config
 * export const handler = step.handler
 */

// Factory functions
export { createStep, createSteps } from './create-step'

// Types
export type {
  StepConfig,
  StepOperation,
  StepOperationConfig,
  GeneratedStep,
  GeneratedSteps,
  EmitStrategy,
  ResponseWrapStrategy,
  StudyIdSource,
  EntityPathConfig,
  StepResponse,
  ValidationErrorDetail,
  ValidationErrorBody,
  ErrorBody,
} from './types'

// Schemas
export {
  standardErrorSchemas,
  badRequestSchema,
  unauthorizedSchema,
  notFoundSchema,
  internalErrorSchema,
  deleteSuccessSchema,
  validationErrorDetailSchema,
} from './schemas/response-schemas'
