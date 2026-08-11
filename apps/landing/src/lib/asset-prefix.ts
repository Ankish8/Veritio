/**
 * When the landing is served via veritio.io (multi-zone rewrite from the app),
 * its static assets must load from the landing's own origin — otherwise the
 * browser requests them at veritio.io/_next and /images, which the app owns.
 *
 * The value is computed once in next.config.mjs, next to Next's own
 * `assetPrefix`, and injected here at build time. Deriving it a second time
 * from NODE_ENV is what broke preview deployments: NODE_ENV is 'production'
 * for previews too, so they pointed at the production domain.
 */
export const ASSET_PREFIX = process.env.NEXT_PUBLIC_ASSET_PREFIX || ''
