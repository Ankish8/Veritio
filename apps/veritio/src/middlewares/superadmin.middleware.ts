/**
 * Superadmin middleware for admin-only API endpoints.
 * Must be placed AFTER authMiddleware in the middleware chain.
 * Checks that the authenticated user matches the SUPERADMIN_USER_ID env var.
 */
export async function requireSuperadmin(req: any, ctx: any, next: () => Promise<any>) {
  const superadminUserId = process.env.SUPERADMIN_USER_ID
  const userId = req.headers['x-user-id']

  if (!superadminUserId || userId !== superadminUserId) {
    ctx.logger?.warn('Superadmin access denied', { userId })
    return {
      status: 403,
      body: { error: 'Forbidden: superadmin access required' },
    }
  }

  return next()
}
