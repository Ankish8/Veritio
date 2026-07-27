import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const bundleAnalyzeMode = process.env.BUNDLE_ANALYZE;
const bundleAnalyzeEnabled =
  process.env.ANALYZE === "true" || !!bundleAnalyzeMode;
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

const isDev = process.env.NODE_ENV !== "production";
const livePreviewFrameSrc = (() => {
  const configured = process.env.NEXT_PUBLIC_LIVE_PREVIEW_ORIGIN;
  if (!configured) return "";
  try {
    return ` ${new URL(configured).origin}`;
  } catch {
    return "";
  }
})();

// Marketing site origin — served at veritio.io/, /pricing, /about, /privacy, /terms,
// /accessibility, /security, /ltd via the multi-zone rewrites below. Its assets load cross-origin
// from here, so it must be allowed in the asset CSP directives.
// NOTE: this must stay the deployed landing even in dev — the landing only sets its
// Next assetPrefix in production, so proxying the local :4003 landing through here
// would 404 its /_next assets. For local landing work, open localhost:4003/ltd directly.
const LANDING_ORIGIN =
  process.env.NEXT_PUBLIC_LANDING_ORIGIN ||
  "https://landing-mu-neon.vercel.app";

// PostHog: client-side posthog-js sends everything first-party through the
// managed reverse proxy at t.veritio.io (evades ad blockers). The us(.assets)
// hosts stay allowlisted as a fallback in case the proxy host is ever bypassed.
const posthogOrigins = [
  "https://t.veritio.io",
  "https://us.i.posthog.com",
  "https://us-assets.i.posthog.com",
].join(" ");

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  "https://*.supabase.co",
  "https://connect.facebook.net",
  "https://t.veritio.io",
  "https://us-assets.i.posthog.com",
  LANDING_ORIGIN,
].join(" ");

const metaTrackingOrigins = [
  "https://www.facebook.com",
  "https://*.facebook.com",
  "https://*.facebook.net",
].join(" ");

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // The default bottom-left dev indicator covers the mobile bottom nav in local
  // iPhone testing. Disable it so the local dev UI matches the real app surface.
  devIndicators: false,

  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",") || [],

  // Force Turbopack to bundle pg instead of auto-externalizing it.
  // Turbopack auto-externalizes pg and generates broken hashed module names
  // (e.g., pg-587764f78a6c7a9c) that can't be resolved at runtime.
  // pg is pure JavaScript with no native bindings, so bundling it is safe.
  transpilePackages: ["pg", "pg-pool", "@veritio/prototype-test"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "logos.composio.dev",
      },
    ],
  },
  // Cache headers for static assets and participant pages
  async headers() {
    return [
      // Security headers for all routes
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src ${scriptSrc} https://js.stripe.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' ${LANDING_ORIGIN}; img-src 'self' https://*.supabase.co https://*.figma.com https://logos.composio.dev ${LANDING_ORIGIN} ${metaTrackingOrigins} ${posthogOrigins} data: blob:; font-src 'self' data: ${LANDING_ORIGIN}; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.up.railway.app wss://*.up.railway.app https://api.stripe.com https://*.polar.sh ${metaTrackingOrigins} ${posthogOrigins} ws://localhost:* wss://localhost:*; frame-src 'self' https://*.figma.com https://*.polar.sh https://polar.sh https://js.stripe.com https://hooks.stripe.com${livePreviewFrameSrc}; frame-ancestors 'self' ${LANDING_ORIGIN}${isDev ? " http://localhost:4003" : ""}; base-uri 'self'; form-action 'self';`,
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
      // Public directory static images — long-lived cache
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Public directory SVGs — long-lived cache
      {
        source: "/:path*.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Participant pages — allow must-revalidate for fresh study data
      {
        source: "/s/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },

  // www→apex at the routing layer (host-conditional) — previously done in
  // middleware, which forced an edge invocation on every request site-wide.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.veritio.io" }],
        destination: "https://veritio.io/:path*",
        permanent: true,
      },
    ];
  },

  // Proxy API requests to Motia server on port 4000
  // EXCEPT /api/auth/* which is handled by Better Auth in Next.js
  // BUT /api/auth/figma/* goes to Motia for Figma OAuth
  async rewrites() {
    return {
      // Multi-zone: serve the marketing site at these exact public paths by proxying
      // to the landing deployment. ('/' is handled in middleware instead, so logged-in
      // users still get the dashboard there.) Every other app URL is untouched.
      beforeFiles: [
        {
          // Motia rc.26 serializes string bodies as JSON. Route public snippet
          // files through Next so script tags receive executable JavaScript.
          source: "/api/snippet/:snippetFile([a-zA-Z0-9_-]+\\.js)",
          destination: "/api/snippet-script/:snippetFile",
        },
        { source: "/pricing", destination: `${LANDING_ORIGIN}/pricing` },
        { source: "/about", destination: `${LANDING_ORIGIN}/about` },
        { source: "/privacy", destination: `${LANDING_ORIGIN}/privacy` },
        { source: "/terms", destination: `${LANDING_ORIGIN}/terms` },
        {
          source: "/accessibility",
          destination: `${LANDING_ORIGIN}/accessibility`,
        },
        { source: "/security", destination: `${LANDING_ORIGIN}/security` },
        { source: "/ltd", destination: `${LANDING_ORIGIN}/ltd` },
      ],
      afterFiles: [
        {
          // Proxy /api/* to Motia EXCEPT /api/auth/* (Better Auth) and /api/billing/*
          // (Polar checkout/portal/webhook are Next.js route handlers — the webhook
          // needs the raw request body for Standard-Webhooks signature verification).
          source: "/api/:path((?!auth|billing|snippet-script).*)*",
          destination: process.env.MOTIA_BACKEND_URL
            ? `${process.env.MOTIA_BACKEND_URL}/api/:path*`
            : "http://localhost:4000/api/:path*",
        },
      ],
    };
  },

  // ioredis: reached via the cache's Redis L2 layer; keep it external so the
  // server requires it from node_modules instead of bundling Node internals.
  serverExternalPackages: [
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
    "ioredis",
  ],

  experimental: {
    serverActions: {
      allowedOrigins: ["veritio.io", "www.veritio.io"],
    },
    optimizePackageImports: [
      "recharts",
      "d3",
      "lucide-react",
      "framer-motion",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-link",
      "@tiptap/extension-image",
      "@tiptap/extension-table",
      "@tiptap/extension-table-row",
      "@tiptap/extension-table-header",
      "@tiptap/extension-table-cell",
      "@tiptap/pm",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "wavesurfer.js",
      "date-fns",
      "radix-ui",
      "@veritio/ui",
      "@veritio/core",
      "@veritio/study-types",
      "@veritio/study-flow",
      "@veritio/card-sort",
      "@veritio/prototype-test",
      "@veritio/analysis-shared",
      "@veritio/dashboard-common",
      "@veritio/swr-config",
      "@veritio/yjs",
      "@veritio/auth",
    ],
  },

  productionBrowserSourceMaps: false,

  // Skip TypeScript errors during build (scripts/docs folders have standalone TS files)
  typescript: {
    ignoreBuildErrors: false,
  },

  turbopack: {
    // Monorepo root for workspace package resolution
    root: path.resolve(__dirname, "../.."),
    // Force external package resolution to prevent Turbopack from generating
    // hashed module names that cannot be required at runtime in dev.
    resolveAlias: {
      pg: "pg",
      "pg-pool": "pg-pool",
      ioredis: "ioredis",
    },
  },
};

export default withNextIntl(withBundleAnalyzer(nextConfig));
