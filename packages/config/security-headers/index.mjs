/**
 * Shared browser-security baseline for every Veritio Next.js deployment.
 * Each deployment supplies its own CSP because the app and marketing site
 * intentionally connect to different external services.
 */
export function createSecurityHeaders({
  contentSecurityPolicy,
  frameOptions = 'SAMEORIGIN',
  permissionsPolicy,
}) {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: frameOptions },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: permissionsPolicy },
    { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
  ]
}
