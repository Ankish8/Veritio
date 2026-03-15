import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const bundleAnalyzeMode = process.env.BUNDLE_ANALYZE;
const bundleAnalyzeEnabled = process.env.ANALYZE === "true" || !!bundleAnalyzeMode;
const analyzeServer = bundleAnalyzeMode
  ? ["server", "both"].includes(bundleAnalyzeMode)
  : true;
const analyzeBrowser = bundleAnalyzeMode
  ? ["browser", "both"].includes(bundleAnalyzeMode)
  : true;

const withBundleAnalyzer = bundleAnalyzer({
  enabled: bundleAnalyzeEnabled,
  analyzeServer,
  analyzeBrowser,
} as any);

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(',') || [],

  // Expose server-side environment variables explicitly
  // This ensures they're available in serverless functions
  env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  },

  // Force Turbopack to bundle pg instead of auto-externalizing it.
  // Turbopack auto-externalizes pg and generates broken hashed module names
  // (e.g., pg-587764f78a6c7a9c) that can't be resolved at runtime.
  // pg is pure JavaScript with no native bindings, so bundling it is safe.
  transpilePackages: ['pg', 'pg-pool', '@veritio/prototype-test'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Cache headers for static assets and participant pages
  async headers() {
    return [
      // Public directory static images — long-lived cache
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Public directory SVGs — long-lived cache
      {
        source: '/:path*.svg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Participant pages — allow must-revalidate for fresh study data
      {
        source: '/s/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ]
  },

  // Proxy API requests to Motia server on port 4000
  // EXCEPT /api/auth/* which is handled by Better Auth in Next.js
  // BUT /api/auth/figma/* goes to Motia for Figma OAuth
  async rewrites() {
    return {
      afterFiles: [
        {
          source: '/api/:path((?!auth).*)*',
          destination: process.env.MOTIA_BACKEND_URL
            ? `${process.env.MOTIA_BACKEND_URL}/api/:path*`
            : 'http://localhost:4000/api/:path*',
        },
      ],
    };
  },

  serverExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],

  experimental: {
    optimizePackageImports: [
      'recharts',
      'd3',
      'lucide-react',
      'framer-motion',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-link',
      '@tiptap/extension-image',
      '@tiptap/extension-table',
      '@tiptap/extension-table-row',
      '@tiptap/extension-table-header',
      '@tiptap/extension-table-cell',
      '@tiptap/pm',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
      'wavesurfer.js',
      'date-fns',
      'radix-ui',
      '@veritio/ui',
      '@veritio/core',
      '@veritio/study-types',
      '@veritio/study-flow',
      '@veritio/card-sort',
      '@veritio/prototype-test',
      '@veritio/analysis-shared',
      '@veritio/dashboard-common',
      '@veritio/swr-config',
    ],
  },

  productionBrowserSourceMaps: false,

  // Skip TypeScript errors during build (scripts/docs folders have standalone TS files)
  typescript: {
    ignoreBuildErrors: true,
  },

  turbopack: {
    // Monorepo root for workspace package resolution
    root: path.resolve(__dirname, '../..'),
    // Force pg resolution to prevent Turbopack from generating hashed external module names
    resolveAlias: {
      pg: 'pg',
      'pg-pool': 'pg-pool',
    },
  },
};

export default withNextIntl(withBundleAnalyzer(nextConfig));
