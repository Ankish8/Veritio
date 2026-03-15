/**
 * Standard Response Schemas for Step Factory
 *
 * These schemas define the standard error response formats used across
 * all generated step handlers. They're used by Motia for documentation
 * and validation.
 */

import { z } from 'zod'

/**
 * Validation error detail schema
 */
export const validationErrorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
})

/**
 * Standard 400 Bad Request response (validation errors)
 */
export const badRequestSchema = z.object({
  error: z.string(),
  details: z.array(validationErrorDetailSchema).optional(),
})

/**
 * Standard 401 Unauthorized response
 */
export const unauthorizedSchema = z.object({
  error: z.string(),
})

/**
 * Standard 404 Not Found response
 */
export const notFoundSchema = z.object({
  error: z.string(),
})

/**
 * Standard 500 Internal Server Error response
 */
export const internalErrorSchema = z.object({
  error: z.string(),
})

/**
 * Standard delete success response
 */
export const deleteSuccessSchema = z.object({
  success: z.boolean(),
})

/**
 * Standard error schemas bundle for Motia responseSchema config
 * Used across all generated steps for consistency
 */
export const standardErrorSchemas = {
  400: badRequestSchema as unknown as z.ZodSchema,
  401: unauthorizedSchema as unknown as z.ZodSchema,
  404: notFoundSchema as unknown as z.ZodSchema,
  500: internalErrorSchema as unknown as z.ZodSchema,
}
