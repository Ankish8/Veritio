/**
 * Shared utilities for Composio API steps
 */

import type { ApiRequest } from '../../../../lib/motia/types'

/**
 * Extract authenticated user ID from request headers
 */
export function getUserId(req: ApiRequest): string {
  return req.headers['x-user-id'] as string
}

/**
 * Standard error responses
 */
export const Errors = {
  invalidParams: (details?: unknown) => ({
    status: 400 as const,
    body: { error: 'Invalid request parameters', ...(details !== undefined ? { details } : {}) },
  }),

  invalidBody: (details?: unknown) => ({
    status: 400 as const,
    body: { error: 'Invalid request body', ...(details !== undefined ? { details } : {}) },
  }),

  notFound: (resource: string) => ({
    status: 404 as const,
    body: { error: `${resource} not found` },
  }),

  forbidden: (message: string) => ({
    status: 403 as const,
    body: { error: message },
  }),

  unauthorized: (message: string) => ({
    status: 401 as const,
    body: { error: message },
  }),

  notConfigured: () => ({
    status: 500 as const,
    body: { error: 'Composio integration not configured. Please contact support.' },
  }),

  serverError: (message = 'An error occurred') => ({
    status: 500 as const,
    body: { error: message },
  }),
}

/**
 * Standard success responses
 */
export const Success = {
  ok: <T>(data: T) => ({
    status: 200 as const,
    body: data,
  }),

  created: <T>(data: T) => ({
    status: 201 as const,
    body: data,
  }),

  noContent: () => ({
    status: 204 as const,
    body: undefined,
  }),

  deleted: () => ({
    status: 200 as const,
    body: { success: true },
  }),
}
