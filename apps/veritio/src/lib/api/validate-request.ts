import type { ZodType, ZodTypeDef } from 'zod'
import type { MotiaLogger } from '../motia/types'

type ValidationSuccess<T> = { success: true; data: T }
type ValidationFailure = {
  success: false
  response: {
    status: 400
    body: {
      error: string
      details: Array<{ path: string; message: string }>
    }
  }
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

export function validateRequest<TOutput, TDef extends ZodTypeDef = ZodTypeDef, TInput = TOutput>(
  schema: ZodType<TOutput, TDef, TInput>,
  data: unknown,
  logger: MotiaLogger,
): ValidationResult<TOutput> {
  const parsed = schema.safeParse(data)

  if (!parsed.success) {
    logger.warn('Validation failed', { errors: parsed.error.issues })
    return {
      success: false,
      response: {
        status: 400,
        body: {
          error: 'Validation failed',
          details: parsed.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      },
    }
  }

  return { success: true, data: parsed.data }
}
