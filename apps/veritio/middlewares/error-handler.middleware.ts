import { ApiMiddleware } from 'motia'
import { ZodError } from 'zod'

/**
 * Error handler middleware for Motia API Steps.
 * Handles ZodError (validation) and generic errors.
 * Should be last in the middleware stack.
 */
export const errorHandlerMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger, traceId } = ctx

  try {
    return await next()
  } catch (error: unknown) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      logger.warn('Validation error', {
        traceId,
        errors: error.issues,
      })

      return {
        status: 400,
        body: {
          error: 'Validation failed',
          details: error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      }
    }

    // Handle generic errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined

    logger.error('Unhandled error', {
      traceId,
      error: errorMessage,
      stack: errorStack,
    })

    return {
      status: 500,
      body: { error: 'Internal server error' },
    }
  }
}
