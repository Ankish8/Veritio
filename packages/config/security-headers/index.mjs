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

function nonceSource(nonce) {
  if (!/^[A-Za-z0-9+/_=-]+$/.test(nonce)) {
    throw new Error('CSP nonce contains unsupported characters')
  }
  return `'nonce-${nonce}'`
}

/** Generate a cryptographically random CSP nonce usable in Edge and Node runtimes. */
export function createCspNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function scriptSources({ development = false, nonce, hosts }) {
  return [
    "'self'",
    ...(nonce ? [nonceSource(nonce), "'strict-dynamic'"] : ["'unsafe-inline'"]),
    ...(development ? ["'unsafe-eval'"] : []),
    ...hosts,
  ].join(' ')
}

export function createAppContentSecurityPolicy({
  landingOrigin,
  livePreviewOrigin,
  development = false,
  nonce,
}) {
  const posthogOrigins = [
    'https://t.veritio.io',
    'https://us.i.posthog.com',
    'https://us-assets.i.posthog.com',
  ].join(' ')
  const metaTrackingOrigins = [
    'https://www.facebook.com',
    'https://*.facebook.com',
    'https://*.facebook.net',
  ].join(' ')
  const scriptSrc = scriptSources({
    development,
    nonce,
    hosts: [
      'https://*.supabase.co',
      'https://connect.facebook.net',
      'https://t.veritio.io',
      'https://us-assets.i.posthog.com',
      'https://js.stripe.com',
      landingOrigin,
    ],
  })
  let livePreviewFrameSrc = ''
  if (livePreviewOrigin) {
    try {
      livePreviewFrameSrc = ` ${new URL(livePreviewOrigin).origin}`
    } catch {
      // Invalid configuration must not widen frame-src.
    }
  }

  return `default-src 'self'; script-src ${scriptSrc}; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' ${landingOrigin}; img-src 'self' https://*.supabase.co https://*.figma.com https://logos.composio.dev ${landingOrigin} ${metaTrackingOrigins} ${posthogOrigins} data: blob:; font-src 'self' data: ${landingOrigin}; media-src 'self' blob: data: https://*.r2.cloudflarestorage.com https://*.r2.dev https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.up.railway.app wss://*.up.railway.app https://*.r2.cloudflarestorage.com https://*.r2.dev https://api.stripe.com https://*.polar.sh ${metaTrackingOrigins} ${posthogOrigins} ws://localhost:* wss://localhost:*; frame-src 'self' https://*.figma.com https://*.polar.sh https://polar.sh https://js.stripe.com https://hooks.stripe.com${livePreviewFrameSrc}; frame-ancestors 'self' ${landingOrigin}; base-uri 'self'; form-action 'self'; object-src 'none';`
}

/** @param {{ nonce?: string, assetOrigin?: string }} [options] */
export function createLandingContentSecurityPolicy(options = {}) {
  const { nonce, assetOrigin = '' } = options
  const scriptSrc = scriptSources({
    nonce,
    hosts: [
      'https://connect.facebook.net',
      'https://t.veritio.io',
      'https://us-assets.i.posthog.com',
      ...(assetOrigin ? [assetOrigin] : []),
    ],
  })

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline' ${assetOrigin}`.trim(),
    `img-src 'self' data: https://www.facebook.com https://*.facebook.com https://t.veritio.io https://us.i.posthog.com https://us-assets.i.posthog.com ${assetOrigin}`.trim(),
    `font-src 'self' data: ${assetOrigin}`.trim(),
    "connect-src 'self' https://t.veritio.io https://us.i.posthog.com https://*.facebook.com",
    'upgrade-insecure-requests',
  ].join('; ')
}
