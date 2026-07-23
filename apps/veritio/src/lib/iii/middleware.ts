/**
 * Middleware composition — byte-for-byte port of motia rc.26's
 * composeMiddleware (dist/index.mjs `src/new/build/utils.ts`).
 *
 * The chain runs IN-PROCESS inside our registered function, not via
 * iii-http's middleware feature (whose contract has no body access, no
 * header mutation, and no shared handler ctx). This preserves exactly:
 *   - execution order (array order, outermost first)
 *   - short-circuiting (a middleware may return a response without next())
 *   - request mutation (authMiddleware injects x-user-id into req.headers;
 *     permission middlewares pin queryParams.organizationId)
 *   - errorHandlerMiddleware's try/catch around the rest of the chain
 */

import type { ApiMiddleware, ApiRequest, ApiResponse, EventHandlerContext } from '../motia/types'

export type ComposedHandler = () => Promise<ApiResponse>

export const composeMiddleware = (...middlewares: readonly ApiMiddleware<any, any, any>[]) => {
  return async (
    req: ApiRequest<unknown>,
    ctx: EventHandlerContext,
    handler: ComposedHandler
  ): Promise<ApiResponse> => {
    return middlewares.reduceRight<ComposedHandler>(
      (nextHandler, middleware) => () => middleware(req, ctx, nextHandler),
      handler
    )()
  }
}
