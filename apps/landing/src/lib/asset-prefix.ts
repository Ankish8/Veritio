/**
 * When the landing is served via veritio.io (multi-zone rewrite from the app),
 * its static assets must load from the landing's own origin — otherwise the
 * browser requests them at veritio.io/_next and /images, which the app owns.
 *
 * In production we point assets at the landing's Vercel domain. Locally (dev)
 * the prefix is empty so everything stays relative.
 *
 * Keep this value in sync with `assetPrefix` in next.config and the rewrite
 * origin in the app's next.config.
 */
export const ASSET_PREFIX =
  process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_LANDING_ORIGIN || 'https://landing-mu-neon.vercel.app'
    : ''
