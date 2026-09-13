import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createLandingContentSecurityPolicy,
  createSecurityHeaders,
} from '../../packages/config/security-headers/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In production these pages are served through veritio.io via a multi-zone
// rewrite, so a relative /_next path would resolve against veritio.io and hit
// the app instead. Production therefore pins assets to the landing's own origin.
//
// NODE_ENV is 'production' for preview builds too, so keying on it alone sent
// every preview to fetch chunk hashes that only exist in the production
// deployment: each preview page died with ChunkLoadError on a blank screen.
// A preview points at its own deployment URL, which is correct whether it is
// opened directly or proxied. Local builds stay relative.
const LANDING_ORIGIN =
  process.env.NEXT_PUBLIC_LANDING_ORIGIN || 'https://landing-mu-neon.vercel.app';

const assetPrefix =
  process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NODE_ENV === 'production'
      ? LANDING_ORIGIN
      : undefined;

const landingContentSecurityPolicy = createLandingContentSecurityPolicy();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  assetPrefix,
  // Hand the same value to client code (src/lib/asset-prefix.ts) so the prefix
  // is computed in exactly one place and the two cannot drift apart.
  env: {
    NEXT_PUBLIC_ASSET_PREFIX: assetPrefix ?? '',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: createSecurityHeaders({
          contentSecurityPolicy: landingContentSecurityPolicy,
          frameOptions: 'DENY',
          permissionsPolicy:
            'camera=(), microphone=(), display-capture=(), geolocation=(), payment=(), usb=()',
        }),
      },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
};

export default config;
