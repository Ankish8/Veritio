/**
 * Standard API response helpers for Motia step handlers.
 * Eliminates repeated `{ status: N, body: { error: '...' } }` boilerplate.
 */

export const errorResponse = {
  badRequest: (error: string) => ({ status: 400 as const, body: { error } }),
  unauthorized: (error: string) => ({ status: 401 as const, body: { error } }),
  forbidden: (error: string) => ({ status: 403 as const, body: { error } }),
  notFound: (error: string) => ({ status: 404 as const, body: { error } }),
  conflict: (error: string) => ({ status: 409 as const, body: { error } }),
  serverError: (error: string) => ({ status: 500 as const, body: { error } }),
}
