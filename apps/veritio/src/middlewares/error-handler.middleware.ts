import { ZodError } from 'zod'

/**
 * Error handler middleware for Motia API endpoints.
 * Catches unhandled errors and returns consistent JSON responses.
 */
export async function errorHandlerMiddleware(_req: any, ctx: any, next: () => Promise<any>) {
  try {
    return await next()
  } catch (error: any) {
    if (error instanceof ZodError) {
      ctx.logger?.warn('Validation failed', { errors: error.issues })
      return { status: 400, body: { error: 'Validation failed', details: error.issues } }
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    ctx.logger?.error('Unhandled error in step handler', { error: message, stack: error?.stack })
    return { status: 500, body: { error: 'Internal Server Error' } }
  }
}
