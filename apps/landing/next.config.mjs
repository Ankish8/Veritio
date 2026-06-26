import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Served via veritio.io (multi-zone rewrite from the app) in production, so assets
// must resolve from the landing's own origin. Keep in sync with src/lib/asset-prefix.ts.
const assetPrefix =
  process.env.NODE_ENV === 'production' ? 'https://landing-mu-neon.vercel.app' : undefined;

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  assetPrefix,
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
};

export default config;
